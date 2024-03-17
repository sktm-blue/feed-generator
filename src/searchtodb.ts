// フィード作成前の投稿もDBに追加するスクリプト
// このファイルは以下サイトのコードを使用させて頂いてます
// https://blog.estampie.work/archives/2972

import { createDb, Database, migrateToLatest } from './db';
import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
import * as AppBskyFeedPost from './lexicon/types/app/bsky/feed/post'
import { AtUri } from '@atproto/syntax'
import { Algos } from './algos'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { AppContext, Config } from './config'
import { AtpAgent } from '@atproto/api'
import { isObj, hasProp } from './lexicon/util'
import { EnvValue } from './envvalue'
import { Util } from './util'
import { Constants } from './constants'
import { Trace } from './trace'

type ResultData = {
	uri: string;
	cid: string;
	textLower: string;
	langs: string[];
	imageCount: number;
	replyParent: string | null;
	replyRoot: string | null;
	indexedAt: string;
};

// Blueskyサーバーに検索リクエストを投げ、ポストの一覧を取得する
async function fetchSearchResults(ctx: AppContext,
	query: string,
	maxLoop: number,
	alreadyLoop: number = 0,
	limit: number = 100,
	cursor: string = ''): Promise<ResultData[]> {

	return new Promise(async (resolve, reject) => {
		// APIのsearchPostsを実行する
		const response = await ctx.agent.api.app.bsky.feed.searchPosts({ q: query, limit, cursor })

		let resultDataArray: ResultData[] = []
		for (const post of response.data.posts) {
			let textLower: string = ''
			let langs: string[] = []
			let replyParent: string | null = null
			let replyRoot: string | null = null
			if (AppBskyFeedPost.isRecord(post.record)) {
				textLower = post.record.text.toLowerCase()
				langs = post.record.langs ?? []
				replyParent = post.record.reply?.parent?.uri ?? null
				replyRoot = post.record.reply?.root?.uri ?? null
			}

			// 画像の添付があればALTテキストを追加し、数を数える
			let recordImageCount: number = 0
			if (AppBskyEmbedImages.isMain(post.embed) || AppBskyEmbedImages.isView(post.embed)) {
				for (const image of post.embed.images) {
					textLower += ' '
					textLower += image.alt.toLowerCase()
					recordImageCount += 1
				}
			}

			const resultData: ResultData = {
				uri: post.uri,
				cid: post.cid,
				textLower: textLower,
				langs: langs,
				imageCount: recordImageCount,
				replyParent: replyParent,
				replyRoot: replyRoot,
				indexedAt: post.indexedAt,
			}
			resultDataArray.push(resultData)
		}

		const currentLoop: number = alreadyLoop + 1;
		if (currentLoop < maxLoop && response.data.cursor && resultDataArray.length > 0) {
			// 再帰呼び出し
			const searchResults: ResultData[] = await fetchSearchResults(ctx, query, maxLoop, currentLoop, limit, response.data.cursor)
			resolve([...resultDataArray, ...searchResults])
		} else {
			// 再帰せずに抜ける
			resolve(resultDataArray)
		}
	})
}

// 取得したデータをDBに登録
async function insertSearchResultsToDb(db: Database, dataArray: ResultData[]): Promise<number> {

	return new Promise(async (resolve, reject) => {
		let insertedCount: number = 0
		for (const data of dataArray) {
			// 検索条件通りのポストであるか確認
			const algos: Algos = Algos.getInstance()
			// ハッシュタグが含まれているか調べる
			const tagArray: string[] = Util.findHashtags(data.textLower)
			const tagMatchFlag: boolean = tagArray.some(tag => algos.searchTagArray.includes(tag))
			// 正規表現検索にマッチするか調べる
			let regexpMatchFlag: boolean = false
			if (!tagMatchFlag) {
				regexpMatchFlag = algos.regexpArray.some(regexp => regexp.test(data.textLower))
			}

			if (tagMatchFlag || regexpMatchFlag) {
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
						const insertText: string = (EnvValue.getInstance().useRegexp) ? data.textLower : ''

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
								imageCount: data.imageCount,
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

							Trace.info('@@ Record is inserted. insertId = ' + insertId)
							if (tagMatchFlag) {
								Trace.debug(' tagArray = ' + tagArray)
							}
							if (regexpMatchFlag) {
								Trace.debug(' insertText = ' + insertText)
							}
							insertedCount++
						}

						// 取り込めたtextを表示(消してもOK)
						//Trace.debug(`Added post to database: ${post.record.text}`);
					}
				})
			}
		}

		resolve(insertedCount)
	})
}

async function main() {
	Trace.info('* searchtodb.ts main start')

	const env: EnvValue = EnvValue.getInstance()
	if (!env.sqliteLocation) {
		Trace.error('Database location is not defined.')
		process.exit(1)
	}
	Trace.debug('* searchtodb.ts createDb start')
	const db = createDb(env.sqliteLocation)
	await migrateToLatest(db)
	Trace.debug('* searchtodb.ts createDb end')

	const didCache = new MemoryCache()
	const didResolver = new DidResolver({
		plcUrl: env.bskyPlcUrl,
		didCache,
	})

	if (!env.publisherHandle) {
		throw new Error('Please provide a handle in the .env file')
	}
	if (!env.publisherAppPassword) {
		throw new Error('Please provide an app password in the .env file')
	}
	const agent = new AtpAgent({ service: env.bskyServiceUrl })
	await agent.login({ identifier: env.publisherHandle, password: env.publisherAppPassword })

	const cfg: Config = {
		port: env.port,
		listenhost: env.listenHost,
		sqliteLocation: env.sqliteLocation,
		subscriptionEndpoint: env.subscriptionEndpoint,
		bskyServiceUrl: env.bskyServiceUrl,
		publisherDid: env.publisherDid,
		subscriptionReconnectDelay: env.subscriptionReconnectDelay,
		hostname: env.hostname,
		serviceDid: env.serviceDid,
	}
	const ctx: AppContext = {
		db,
		didResolver,
		cfg,
		agent
	}

	const algos: Algos = Algos.getInstance()
	for (const searchTag of algos.searchTagArray) {
		Trace.info('* Search ' + searchTag + ' start.')
		const searchResults: ResultData[] = await fetchSearchResults(ctx, searchTag, env.searchToDbLoop)
		Trace.info('* Search ' + searchTag + ' end. hits = ' + searchResults.length)
		const insertedCount: number = await insertSearchResultsToDb(db, searchResults)
		Trace.info('* Insert ' + searchTag + ' end. inserted = ' + insertedCount)
	}
	for (const searchWord of algos.searchWordForRegexpArray) {
		Trace.info('* Search ' + searchWord + ' start.')
		const searchResults: ResultData[] = await fetchSearchResults(ctx, searchWord, env.searchToDbLoop)
		Trace.info('* Search ' + searchWord + ' end. hits = ' + searchResults.length)
		const insertedCount: number = await insertSearchResultsToDb(db, searchResults)
		Trace.info('* Insert ' + searchWord + ' end. inserted = ' + insertedCount)
	}

	Trace.info('* searchtodb.ts main end')
}

main()
