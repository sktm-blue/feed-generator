import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { AtUri } from '@atproto/syntax'
import { expressionBuilder  } from 'kysely'
import { Database } from '../db';
import { Util } from '../util'
import { Constants } from '../constants'
import { Trace } from '../trace'

export abstract class AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public abstract getShortname(): string
	// 認証が必要なフィードはgetAuthFlag()をオーバーライドしてtrueを返す
	// 認証を必要とするフィードかどうか
	public getAuthFlag(): boolean {
		return false
	}

	// ハッシュタグ検索する場合はgetTagArray()をオーバーライド
	// ハッシュタグで検索する場合のタグ(「#」は不要)
	public getTagArray(): string[] {
		return []
	}
	// 正規表現検索する場合はgetSearchWordForRegexpArray()getRegexpPattern()をオーバーライド
	// 正規表現検索する場合の取得用ワード
	public getSearchWordForRegexpArray(): string[] {
		return []
	}
	// 正規表現検索時のパターン
	public getRegexpPattern(): string {
		return ''
	}

	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ALL_LANG
	}
	// 表示リプライ設定
	protected getReplySwitch(): number {
		return Constants.REPLY_SWITCH.ALL_POST
	}
	// 画像付き投稿表示設定
	protected getImageSwitch(): number {
		return Constants.IMAGE_SWITCH.ALL_POST
	}
	// 固定ポストのURI
	// 取得方法は、SkyFeedで該当ポストを開き、Copy JSONで得られるJSON内のuriをコピーする
	// 画面ではこの配列の逆順に表示される(一番下のものが一番上に表示される)
	protected getPostUriArray(): string[] {
		return []
	}

	// URI一覧構築
	public async handler(ctx: AppContext, params: QueryParams, requester: string = '') {

		const tagArray: string[] = this.getTagArray()
		const searchWordForRegexpArray: string[] = this.getSearchWordForRegexpArray()
		if (tagArray.length == 0 && searchWordForRegexpArray.length == 0) {
			throw new Error('No search pattern')
		}

		let builder = ctx.db
			.selectFrom('post')
			.selectAll()

		// 表示言語設定
		const langSwitch: number = this.getLangSwitch()
		if (langSwitch == Constants.LANG_SWITCH.ONLY_JA) {
			builder = builder.where('lang1', '=', Constants.LANG_NUMBER.JA)				// 日本語の投稿のみ
		} else if (langSwitch == Constants.LANG_SWITCH.ONLY_EN) {
			builder = builder.where('lang1', '=', Constants.LANG_NUMBER.EN)				// 英語の投稿のみ
		}

		// 表示リプライ設定
		const replySwitch: number = this.getReplySwitch()
		if (replySwitch == Constants.REPLY_SWITCH.NO_REPLY) {
			builder = builder.where('postType', '=', Constants.POST_TYPE.NORMAL)		// 通常のポストのみ表示
		} else if (replySwitch == Constants.REPLY_SWITCH.REPLY_TO_OWN) {
			builder = builder.where('postType', '<=', Constants.POST_TYPE.REPLY_TO_OWN)	// 通常のポストと自分自身へのリプライを表示
		}

		// 画像あり設定
		const imageSwitch: number = this.getImageSwitch()
		if (imageSwitch == Constants.IMAGE_SWITCH.NO_IMAGE_ONLY) {
			builder = builder.where('imageCount', '=', 0)		// 画像なしの投稿のみ表示
		} else if (imageSwitch == Constants.IMAGE_SWITCH.EXISTS_IMAGE_ONLY) {
			builder = builder.where('imageCount', '>', 0)		// 画像ありの投稿のみ表示
		}

		// タグ検索
		if (tagArray.length > 0) {
			const ebTag = expressionBuilder(ctx.db.selectFrom('tag'))
			let ebTagStrArray: any = []
			for (const tag of tagArray) {
				ebTagStrArray.push(ebTag.eb('tagStr', '=', tag))
			}
			const ebOr = ebTag.or(ebTagStrArray)
	
			builder = builder
				.where(({ eb, selectFrom }) => eb(
					'id',
					'in',
					selectFrom('tag')
						.distinct()
						.select('id')
						.where(ebOr)
				))
		}

		// 正規表現検索
		const regexpPattern: string = this.getRegexpPattern()
		if (regexpPattern.length > 0) {
			builder = builder.where('text', 'regexp', regexpPattern)
		}

		builder = builder
			.orderBy('indexedAt', 'desc')	// 日時でソート(降順)
			.orderBy('cid', 'desc')			// cidでソート(降順)

		builder = builder.limit(params.limit)
		
		if (params.cursor) {
			const [indexedAt, cid] = params.cursor.split('::')
			if (!indexedAt || !cid) {
				throw new InvalidRequestError('malformed cursor')
			}
			const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
			builder = builder
				// >>> for kysely 0.22.0
				//.where('post.indexedAt', '<', timeStr)
				//.orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
				//.where('post.cid', '<', cid)
				// <<< 
				// >>> for kysely 0.27.0
				.where(eb => eb('post.indexedAt', '<', timeStr)
    				.or(eb('post.indexedAt', '=', timeStr).and('post.cid', '<', cid)))
				// <<< 
		}

		const res = await builder.execute()

		// ***デバッグ用
		//let ids: number[] = []
		//for (const resItem of res) {
		//	Trace.Debug(resItem.text)
		//	Trace.Debug('------------------------------')
		//	ids.push(resItem.id)
		//}
		//Trace.debug('ids = ' + ids.join(','))
		//Trace.debug('------------------------------')
		// ***

		const feed = res.map((row) => ({
			post: row.uri,
		}))

		// 固定ポストを先頭に挿入
		if (params.cursor === undefined) {
			const postUriArray: string[] = this.getPostUriArray()
			for (const postUri of postUriArray) {
				feed.unshift({
					post: postUri,
				})
			}
		}

		let cursor: string | undefined
		const last = res.at(-1)
		if (last) {
			cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
		}

		return {
			cursor,
			feed,
		}
	}
}
