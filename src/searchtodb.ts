// フィード作成前の投稿もDBに追加するスクリプト
// このファイルは以下サイトのコードを使用させて頂いてます
// https://blog.estampie.work/archives/2972

import https from 'https';
import dotenv from 'dotenv';
import { createDb, Database, migrateToLatest } from './db';
import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
import { AtUri } from '@atproto/syntax'
import { Algos } from './algos'
import { Util } from './util'
import { Constants } from './constants'
import { Trace } from './trace'
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
			})
		}).on('error', (error) => {
			reject(error)
		})
	})
}

// 取得したデータをDBに登録
async function saveSearchResultsToDb(db: Database, dataArray: ResultData[]): Promise<void> {
	let insertedCount: number = 0
	for (const data of dataArray) {
		// text取得
		let textLower: string = data.text.toLowerCase()

		// 画像の添付があればALTテキスト追加
		let recordImageCount: number = 0
		for (const image of data.images) {
			textLower += ' '
			textLower += image.alt.toLowerCase()
			recordImageCount += 1
		}

		// 検索語句が指定通り含まれているか確認
		// Blueskyの検索機能が日本語を適切に検索しないための措置
		// 例えば「買った」で検索しても「買うのを諦めちゃった」がヒットするため、完全に一致しないものは弾く
		// 今後Bluesky側が改善されれば必要なくなる処理
		let includeFlag: boolean = false
		const algos: Algos = Algos.getInstance()
		// ハッシュタグが適切に含まれているかを調べる
		const tagArray: string[] = Util.findHashtags(textLower)
		//Trace.debug('tagArray = ' + tagArray)
		const searchTagArray: string[] = algos.getSearchTagArray()
		for (const tag of tagArray) {
			for (const searchTag of searchTagArray) {
				includeFlag = includeFlag || (tag === searchTag)			// 完全一致のみOK
			}
		}
		// 検索ワードが適切に含まれているかを調べる
		const searchWordArray: string[] = algos.getSearchWordForRegexpArray()
		for (const searchWord of searchWordArray) {
			includeFlag = includeFlag || textLower.includes(searchWord)		// 含まれていればOK
		}

		let insertedId: number = 0
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
					const langs: number[] = Util.getLangs(data.langs)

					// 投稿タイプ		
					let postType: number = Util.getPostType(data.uri, data.replyParent)

					// 正規表現使用時のみtextに挿入を行う
					const useRegexpFlag: string = Util.maybeStr(process.env.FEEDGEN_USE_REGEXP) ?? 'false'
					const insertText: string = (useRegexpFlag === 'true') ? textLower : ''

					// postテーブルに挿入
					const result = await trx.insertInto('post')
						.values({
							uri: data.uri,
							cid: data.cid,
							text: insertText,
							lang1: langs[0],
							lang2: langs[1],
							lang3: langs[2],
							postType: postType,
							indexedAt: data.indexedAt,
							imageCount: recordImageCount,
						})
						.executeTakeFirst()

					// tagテーブルに挿入
					if (result.insertId !== undefined) {
						const insertId: number = Number(result.insertId)

						for (const tag of tagArray) {
							await trx.insertInto('tag')
								.values({
									id: insertId,
									tagStr: tag,
								})
								.executeTakeFirst()
						}

						let traceStr: string = '@@ Record is inserted. insertId = ' + insertId
						if (tagArray.length > 0) {
							traceStr = traceStr + ' tagArray = ' + tagArray
						}
						if (insertText.length > 0) {
							traceStr = traceStr + ' insertText = ' + insertText
						}
						Trace.info(traceStr)
					}

					// 取り込めたtextを表示(消してもOK)
					//traceDebug(`Added post to database: ${post.record.text}`);
				}
			})
		}
	}
}

async function main() {
	try {
		Trace.info('searchtodb.ts main start')

		const dbLocation = Util.maybeStr(process.env.FEEDGEN_SQLITE_LOCATION)
		if (!dbLocation) {
			Trace.error('Database location is not defined.')
			process.exit(1)
		}

		Trace.debug('searchtodb.ts createDb start')
		const db = createDb(dbLocation)
		await migrateToLatest(db)
		Trace.debug('searchtodb.ts createDb end')

		const dbLoop: number = Util.maybeInt(process.env.FEEDGEN_SEARCH_TO_DB_LOOP) ?? 1
		const algos: Algos = Algos.getInstance()
		const searchTagArray: string[] = algos.getSearchTagArray()
		const searchTagArrayWithSharp: string[] = Util.addHashtagSharp(searchTagArray)
		for (const searchTag of searchTagArrayWithSharp) {
			const searchResults: ResultData[] = await fetchSearchResults(searchTag, dbLoop)
			Trace.info('Search ' + searchTag + ' end. hits = ' + searchResults.length)
			await saveSearchResultsToDb(db, searchResults)
		}
		const searchWordArray: string[] = algos.getSearchWordForRegexpArray()
		for (const searchWord of searchWordArray) {
			const searchResults: ResultData[] = await fetchSearchResults(searchWord, dbLoop)
			Trace.info('Search ' + searchWord + ' end. hits = ' + searchResults.length)
			await saveSearchResultsToDb(db, searchResults)
		}

		Trace.info('searchtodb.ts main end')
	} catch (e) {
		Trace.error('(searchtodb.ts main) ' + e)
	}
}

main()
