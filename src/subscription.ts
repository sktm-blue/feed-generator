import {
	OutputSchema as RepoEvent,
	isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { INSERT_WORDS, INSERT_ACTORS } from './const'
import { trace, traceerr } from './trace'

import * as AppBskyEmbedImages from './lexicon/types/app/bsky/embed/images'
 
export class FirehoseSubscription extends FirehoseSubscriptionBase {
	async handleEvent(evt: RepoEvent) {
		if (!isCommit(evt)) return
		const ops = await getOpsByType(evt)

		// This logs the text of every post off the firehose.
		// Just for fun :)
		// Delete before actually using
		//for (const post of ops.posts.creates) {
		//  console.log(post.record.text)
		//}

		const postsToDelete = ops.posts.deletes.map((del) => del.uri)
		const postsToCreate = ops.posts.creates
			.filter((create) => {
				// text取得
				let recordText: string = create.record.text

				// 画像の添付があればALTテキスト追加
				let recordImageCount: number = 0
				if (AppBskyEmbedImages.isMain(create.record.embed)) {
					const images: AppBskyEmbedImages.Image[] = create.record.embed.images
					for (const image of images) {
						recordText += image.alt
						recordImageCount += 1
					}
				}

				let includeFlag: boolean = false
				const textLower: string = create.record.text.toLowerCase()
				for (const insertWord of INSERT_WORDS) {
					includeFlag = includeFlag || textLower.includes(insertWord.toLowerCase())
				}
				for (const insertActor of INSERT_ACTORS) {
					includeFlag = includeFlag || create.uri.includes(insertActor)
				}
				return includeFlag
			})
			.map((create) => {
				// 以下2つの処理は上記filterと同じことをやっていて効率が悪い
				// text取得
				let textLower: string = create.record.text.toLowerCase()
				trace(textLower)

				// 画像の添付があればALTテキスト追加
				let recordImageCount: number = 0
				if (AppBskyEmbedImages.isMain(create.record.embed)) {
					const images: AppBskyEmbedImages.Image[] = create.record.embed.images
					for (const image of images) {
						trace('ALT : ' + image.alt)
						textLower += image.alt.toLowerCase()
						recordImageCount += 1
					}
				}
				trace('imageCount = ' + recordImageCount)

				// 言語情報
				let langs: string[] = ["", "", ""]
				trace('langs start create.record.langs.length = ' + create.record.langs?.length)
				trace('langs start create.record.langs = ' + create.record.langs)
				if (create.record.langs !== undefined) {
					for (let i: number = 0; i < langs.length; i++) {
						if (i < create.record.langs.length) {
							langs[i] = create.record.langs[i]
							trace(langs[i])   // jaやenが出力される
						}
					}
				}
				trace('langs end')

				// map alf-related posts to a db row
				return {
					uri: create.uri,
					cid: create.cid,
					text: textLower, // textフィールドを追加
					lang1: langs[0], // lang1フィールドを追加
					lang2: langs[1], // lang2フィールドを追加
					lang3: langs[2], // lang3フィールドを追加
					replyParent: create.record?.reply?.parent.uri ?? null,
					replyRoot: create.record?.reply?.root.uri ?? null,
					indexedAt: new Date().toISOString(),
					imageCount: recordImageCount, // imageCountフィールドを追加
				}
			})

		if (postsToDelete.length > 0) {
			await this.db
				.deleteFrom('post')
				.where('uri', 'in', postsToDelete)
				.execute()
		}
		//if (postsToCreate.length > 0) {
		//  await this.db
		//    .insertInto('post')
		//    .values(postsToCreate)
		//    .onConflict((oc) => oc.doNothing())
		//    .execute()
		//}
		if (postsToCreate.length > 0) {
			await this.db.transaction().execute(async (trx) => {
				for (const postToCreate of postsToCreate) {
					// 同じuriを持つレコードがデータベースに存在するか確認
					const exists = await trx
						.selectFrom('post')
						.select('uri')
						.where('uri', '=', postToCreate.uri)
						.execute();
					// レコードが存在しない場合のみ挿入を実行
					if (exists.length === 0) {
						await trx.insertInto('post')
							.values(postToCreate)
							.onConflict((oc) => oc.doNothing())
							.execute()
					}
				}
			})
		}

	}
}
