import {
	OutputSchema as RepoEvent,
	isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Algos } from './algos'
import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
import { EnvValue } from './envvalue'
import { Util } from './util'
import { Constants } from './constants'
import { Trace } from './trace'

type ResultData = {
	uri: string
	cid: string
	text: string
	tagArray: string[]
	lang1: number
	lang2: number
	lang3: number
	postType: number
	indexedAt: string
	imageCount: number
}

export class FirehoseSubscription extends FirehoseSubscriptionBase {
	async handleEvent(evt: RepoEvent) {
		if (!isCommit(evt)) return

		try {
			//Trace.debug('handleEvent')
			this.traceCount()
			this.execCount++
			const env: EnvValue = EnvValue.getInstance()

			const ops = await getOpsByType(evt)

			// This logs the text of every post off the firehose.
			// Just for fun :)
			// Delete before actually using
			//for (const post of ops.posts.creates) {
			//  console.log(post.record.text)
			//}

			const postsToDelete = ops.posts.deletes.map((del) => del.uri)

			const dataArray: ResultData[] = []
			for (const create of ops.posts.creates) {
				// text取得
				let textLower: string = create.record.text.toLowerCase()

				// 画像の添付があればALTテキストを追加し、数を数える
				let recordImageCount: number = 0
				if (AppBskyEmbedImages.isMain(create.record.embed) || AppBskyEmbedImages.isView(create.record.embed)) {
					for (const image of create.record.embed.images) {
						textLower += ' '
						textLower += image.alt.toLowerCase()
						recordImageCount += 1
					}
				}
				//Trace.debug(textLower)
				//Trace.debug('imageCount = ' + recordImageCount)

				// 本文+ALTテキストを見て収集するかどうか判定する
				const algos: Algos = Algos.getInstance()
				// ハッシュタグが含まれているか調べる
				const tagArray: string[] = Util.findHashtags(textLower)
				const tagMatchFlag: boolean =  tagArray.some(tag => algos.searchTagArray.includes(tag))
				// 正規表現検索にマッチするか調べる
				let regexpMatchFlag: boolean = false
				if (!tagMatchFlag) {
					regexpMatchFlag = algos.regexpArray.some(regexp => regexp.test(textLower))
				}

				// 言語情報
				const langs: number[] = Util.getLangs(create.record.langs)
				if (langs[0] == Constants.LANG_NUMBER.JA) {
					this.jaCount++
				} else if (langs[0] == Constants.LANG_NUMBER.EN) {
					this.enCount++
				}

				if (tagMatchFlag || regexpMatchFlag) {
					// 投稿タイプ
					const parentUri: string | null = create.record?.reply?.parent.uri ?? null
					const postType: number = Util.getPostType(create.uri, parentUri)

					dataArray.push({
						uri: create.uri,
						cid: create.cid,
						text: textLower,
						tagArray: tagArray,
						lang1: langs[0],
						lang2: langs[1],
						lang3: langs[2],
						postType: postType,
						indexedAt: new Date().toISOString(),
						imageCount: recordImageCount,
					})

					if (env.debugMode) {
						if (tagMatchFlag) {
							Trace.debug('tagArray = ' + tagArray)
						}
						if (regexpMatchFlag) {
							Trace.debug('textLower = ' + textLower)
						}
					}
				}

			}

			if (postsToDelete.length > 0) {
				await this.db
					.deleteFrom('post')
					.where('uri', 'in', postsToDelete)
					.execute()
			}

			for (const data of dataArray) {
				this.db.transaction().execute(async (trx) => {
					// 同じuriを持つレコードがデータベースに存在するか確認
					const exists = await trx
						.selectFrom('post')
						.select('uri')
						.where('uri', '=', data.uri)
						.execute()
					// レコードが存在しない場合のみ挿入を実行
					if (exists.length === 0) {
						// 正規表現使用時のみtextに挿入を行う
						const insertText: string = (EnvValue.getInstance().useRegexp) ? data.text : ''

						// postテーブルに挿入
						const result = await trx
							.insertInto('post')
							.values({
								uri: data.uri,
								cid: data.cid,
								text: insertText,
								lang1: data.lang1,
								lang2: data.lang2,
								lang3: data.lang3,
								postType: data.postType,
								indexedAt: data.indexedAt,
								imageCount: data.imageCount,
							})
							.onConflict((oc) => oc.doNothing())
							.executeTakeFirst()

						// tagテーブルに挿入
						if (result.insertId !== undefined) {
							const id: number = Number(result.insertId)
							//Trace.debug('insertId = ' + id)

							for (const tag of data.tagArray) {
								await trx.insertInto('tag')
									.values({
										id: id,
										tagStr: tag,
									})
									.executeTakeFirst()
							}

							this.insertedCount++
							Trace.info('@@ Record is inserted. insertId = ' + result.insertId)
						}

					}
				})
			}
		} catch (e) {
			this.errorCount++
			Trace.error('(FirehoseSubscription) ' + e)
		}
	}

	private execCount: number = 0
	private jaCount: number = 0
	private enCount: number = 0
	private insertedCount: number = 0
	private errorCount: number = 0
	private prevHours: number = -1

	// 実行回数をログに出力
    private traceCount(): void {
		const now: Date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000))  // 日本時間で取得
		const nowHours: number = now.getHours()
		if (this.prevHours >= 0 && this.prevHours != nowHours) {
			Trace.info(`FirehoseSubscription exec = ${this.execCount}(ja = ${this.jaCount}, en = ${this.enCount}), inserted = ${this.insertedCount}, error = ${this.errorCount}`)
			this.execCount = 0
			this.jaCount = 0
			this.enCount = 0
			this.insertedCount = 0
			this.errorCount = 0
		}
		this.prevHours = nowHours
	}
}
