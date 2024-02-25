// フィード作成前の投稿もDBに追加するスクリプト
// このファイルは以下サイトのコードを使用させて頂いてます
// https://blog.estampie.work/archives/2972

import https from 'https';
import dotenv from 'dotenv';
import { createDb, Database } from './db';
import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
import { INSERT_WORDS, INSERT_ACTORS } from './const'
import { traceDebug, traceInfo, traceError } from './trace'
dotenv.config();

type ResultData = {
	uri: string;
	cid: string;
	text: string;
	langs: string[];
	images: AppBskyEmbedImages.Image[];
	replyParent: string | null;
	replyRoot: string | null;
	indexedAt: string;
};

// Blueskyサーバーに検索リクエストを投げ、ポストの一覧を取得する
async function fetchSearchResults(query: string,
	maxLoop: number,
	alreadyLoop: number = 0,
	limit: number = 100,
	cursor: string = ''): Promise<ResultData[]> {
	let url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${limit}`
	if (cursor) {
		url += `&cursor=${encodeURIComponent(cursor)}`
	}
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = ''
			res.on('data', (chunk) => {
				data += chunk;
			})
			res.on('end', async () => {
				try {
					//traceDebug('JSON.parse start')
					const result = JSON.parse(data)
					//traceDebug('JSON.parse end')

					let resultDataArray: ResultData[] = [];
					for (const post of result.posts) {
						let embedImages: AppBskyEmbedImages.Image[] = []
						if (AppBskyEmbedImages.isMain(post.record.embed)) {
							embedImages = post.record.embed.images
						}

						const resultData: ResultData = {
							uri: post.uri,
							cid: post.cid,
							text: post.record.text,
							langs: post.record.langs,
							images: embedImages,
							replyParent: post.record?.reply?.parent.uri ?? null,
							replyRoot: post.record?.reply?.root.uri ?? null,
							indexedAt: post.indexedAt,
						}
						resultDataArray.push(resultData)
					}

					const currentLoop: number = alreadyLoop + 1;
					if (currentLoop < maxLoop && result.cursor && resultDataArray.length > 0) {
						// 再帰呼び出し
						const nextResults = await fetchSearchResults(query, maxLoop, currentLoop, limit, result.cursor)
						resolve([...resultDataArray, ...nextResults])
					} else {
						// 再帰せずに抜ける
						resolve(resultDataArray)
					}
				} catch (error) {
					reject(error)
				}
			})
		}).on('error', (error) => {
			reject(error)
		})
	})
}

// Blueskyサーバーにユーザーのdidを投げ、ポストの一覧を取得する
async function fetchActorSearchResults(actor: string,
	maxLoop: number,
	alreadyLoop: number = 0,
	limit: number = 100,
	cursor: string = ''): Promise<ResultData[]> {
	let url = `https://api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`
	if (cursor) {
		url += `&cursor=${encodeURIComponent(cursor)}`
	}
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = ''
			res.on('data', (chunk) => {
				data += chunk
			})
			res.on('end', async () => {
				try {
					//traceDebug('JSON.parse start')
					const result = JSON.parse(data)
					//traceDebug('JSON.parse end')

					let resultDataArray: ResultData[] = []
					for (const feedElement of result.feed) {
						const post: any = feedElement.post
						let embedImages: AppBskyEmbedImages.Image[] = []
						if (AppBskyEmbedImages.isMain(post.record.embed)) {
							embedImages = post.record.embed.images
						}

						const resultData: ResultData = {
							uri: post.uri,
							cid: post.cid,
							text: post.record.text,
							langs: post.record.langs,
							images: embedImages,
							replyParent: post.record?.reply?.parent.uri ?? null,
							replyRoot: post.record?.reply?.root.uri ?? null,
							indexedAt: post.indexedAt,
						}
						resultDataArray.push(resultData)
					}

					const currentLoop: number = alreadyLoop + 1;
					if (currentLoop < maxLoop && result.cursor && resultDataArray.length > 0) {
						// 再帰呼び出し
						const nextResults = await fetchActorSearchResults(actor, maxLoop, currentLoop, limit, result.cursor)
						resolve([...resultDataArray, ...nextResults])
					} else {
						// 再帰せずに抜ける
						resolve(resultDataArray)
					}
				} catch (error) {
					reject(error)
				}
			})
		}).on('error', (error) => {
			reject(error)
		})
	})
}

// 取得したデータをDBに登録
async function saveSearchResultsToDb(db: Database, dataArray: ResultData[]): Promise<void> {
	try {
		let insertedCount: number = 0
		for (const data of dataArray) {
			// text取得
			let textLower: string = data.text.toLowerCase()

			// 画像の添付があればALTテキスト追加
			let recordImageCount: number = 0
			for (const image of data.images) {
				textLower += image.alt.toLowerCase()
				recordImageCount += 1
			}

			// 検索語句が指定通り含まれているか確認
			// Blueskyの検索機能が日本語を適切に検索しないための措置
			// 例えば「買った」で検索しても「買うのを諦めちゃった」がヒットするため、完全に一致しないものは弾く
			// 今後Bluesky側が改善されれば必要なくなる処理
			let includeFlag: boolean = false
			for (const insertWord of INSERT_WORDS) {
				includeFlag = includeFlag || textLower.includes(insertWord.query)
			}

			if (includeFlag) {
				//traceDebug(textLower);
				//traceDebug('imageCount = ' + recordImageCount)
				await db.transaction().execute(async (trx) => {
					// 同じuriを持つレコードがデータベースに存在するか確認
					const exists = await trx
						.selectFrom('post')
						.select('uri')
						.where('uri', '=', data.uri)
						.execute()
					// レコードが存在しない場合のみ挿入を実行
					if (exists.length === 0) {
						// 言語情報
						let langs: string[] = ["", "", ""]
						//traceDebug('langs start create.record.langs.length = ' + data.langs?.length)
						//traceDebug('langs start create.record.langs = ' + data.langs)
						if (data.langs !== undefined) {
							for (let i: number = 0; i < langs.length; i++) {
								if (i < data.langs.length) {
									langs[i] = data.langs[i]
									//traceDebug(langs[i])   // jaやenが出力される
								}
							}
						}
						//traceDebug('langs end')

						await trx.insertInto('post')
							.values({
								uri: data.uri,
								cid: data.cid,
								text: textLower, // textフィールドを追加
								lang1: langs[0], // lang1フィールドを追加
								lang2: langs[1], // lang2フィールドを追加
								lang3: langs[2], // lang3フィールドを追加
								replyParent: data.replyParent,
								replyRoot: data.replyRoot,
								indexedAt: data.indexedAt,
								imageCount: recordImageCount, // imageCountフィールドを追加
							})
							.execute()
						// 取り込めたtextを表示(消してもOK)
						//traceDebug(`Added post to database: ${post.record.text}`);
						insertedCount++
					}
				})
			}
		}
		traceInfo('insertedCount = ' + insertedCount)
	} catch (error) {
		traceError('saveSearchResultsToDb error', error)
	}
}

async function main() {
	try {
		traceInfo('searchtodb.ts start')

		const dbLocation = maybeStr(process.env.FEEDGEN_SQLITE_LOCATION)
		if (!dbLocation) {
			traceError('Database location is not defined.')
			process.exit(1)
		}

		traceDebug('searchtodb.ts createDb start')
		const db = createDb(dbLocation)
		traceDebug('searchtodb.ts createDb end')

		for (const insertWord of INSERT_WORDS) {
			const searchResults: ResultData[] = await fetchSearchResults(insertWord.query, insertWord.maxLoop)
			traceInfo('Search ' + insertWord.query + ' end. maxLoop = ' + insertWord.maxLoop + ' hits = ' + searchResults.length)
			await saveSearchResultsToDb(db, searchResults)
		}
		for (const insertActor of INSERT_ACTORS) {
			const searchResults: ResultData[] = await fetchActorSearchResults(insertActor.query, insertActor.maxLoop)
			traceInfo('Search ' + insertActor.query + ' end. maxLoop = ' + insertActor.maxLoop + ' hits = ' + searchResults.length)
			await saveSearchResultsToDb(db, searchResults)
		}

		traceError('*** errtest')
		traceInfo('searchtodb.ts end')
	} catch (error) {
		traceError('searchtodb.ts error', error)
		process.exit(1) // エラーが発生した場合終了
	}
}

const maybeStr = (val?: string) => val

main()
