import {
	OutputSchema as RepoEvent,
	isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Algos } from './algos'
import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
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

				// 画像の添付があればALTテキスト追加
				let recordImageCount: number = 0
				if (AppBskyEmbedImages.isMain(create.record.embed)) {
					const images: AppBskyEmbedImages.Image[] = create.record.embed.images
					for (const image of images) {
						textLower += ' '
						textLower += image.alt.toLowerCase()
						recordImageCount += 1
					}
				}
				//Trace.debug(textLower)
				//Trace.debug('imageCount = ' + recordImageCount)

				// 本文+ALTテキストを見て収集するかどうか判定する
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

				if (includeFlag) {
					// ハッシュタグ
					const tagArray: string[] = Util.findHashtags(textLower)
					//Trace.debug('tagArray = ' + tagArray)

					// 言語情報
					const langs: number[] = Util.getLangs(create.record.langs)

					// 投稿タイプ
					const parentUri: string | null = create.record?.reply?.parent.uri ?? null
					let postType: number = Util.getPostType(create.uri, parentUri)

					// map alf-related posts to a db row
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

				}

			}

			if (postsToDelete.length > 0) {
				await this.db
					.deleteFrom('post')
					.where('uri', 'in', postsToDelete)
					.execute()
			}

			if (dataArray.length > 0) {
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
							const useRegexpFlag: string = Util.maybeStr(process.env.FEEDGEN_USE_REGEXP) ?? 'false'
							const insertText: string = (useRegexpFlag === 'true') ? data.text : ''

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

								Trace.info('@@ Record is inserted. insertId = ' + result.insertId)
							}

						}
					})
				}
			}
		} catch (e) {
			Trace.error('(FirehoseSubscription) ' + e)
		}
	}
}
