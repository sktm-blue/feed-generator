import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { REPLY_FLAG } from '../const'
import { traceDebug, traceInfo, traceError } from '../trace'
import { AtUri } from '@atproto/syntax'
import { Database } from '../db';

export abstract class AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public abstract getShortname(): string

	// 固定ポストのURI
	// 取得方法は、SkyFeedで該当ポストを開き、Copy JSONで得られるJSON内のuriをコピーする
	// 画面ではこの配列の逆順に表示される(一番下のものが一番上に表示される)
	protected abstract getFixedPostUris(): string[]

	// リプライを表示させるか
	// REPLY_FLAG.NO_DISPLAY : 表示させない
	// REPLY_FLAG.ONLY_OWN_REPLY : 自分自身へのリプライのみ表示させる
	// REPLY_FLAG.ALL_REPLY : 全てのリプライを表示させる
	protected abstract getReplyFlag(): number

	protected abstract getBuilder(db: Database): any

	public handler = async (ctx: AppContext, params: QueryParams) => {
		let builder = this.getBuilder(ctx.db).limit(params.limit)

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
				// <<< 
				// >>> for kysely 0.27.0
				.where((eb) =>
					eb('post.indexedAt', '<', timeStr).or('post.indexedAt', '=', timeStr)
				)
				// <<< 
				.where('post.cid', '<', cid)
		}

		const res = await builder.execute()

		// リプライ表示判定
		const filteredRes = res.filter((row) => {
			const replyFlag: number = this.getReplyFlag()
			if (replyFlag == REPLY_FLAG.ALL_REPLY) {
				return true		// リプライであるかないかに関わらず全て表示させる
			} else {
				if (row.replyParent != null && row.replyParent.length > 0) {
					// リプライの場合
					if (replyFlag == REPLY_FLAG.ONLY_OWN_REPLY) {
						//const splitIndex: number = row.uri.indexOf('app.bsky')
						//const splitStr: string = row.uri.substring(0, splitIndex)
						//return row.replyParent.includes(splitStr)	// 自分自身へのリプライの場合は表示させる
						return row.replyParent.includes(new AtUri(row.uri).hostname)	// 自分自身へのリプライの場合は表示させる
					} else {
						return false	// リプライを表示させない
					}
				} else {
					// リプライではない場合
					return true
				}
			}
		})

		// ***デバッグ用
		/*
		for (const resItem of filteredRes) {
			traceDebug(resItem.text)
			traceDebug('------------------------------')
		}
		*/
		// ***

		const feed = filteredRes.map((row) => ({
			post: row.uri,
		}))

		// 固定ポストを先頭に挿入
		if (params.cursor === undefined) {
			for (const fixedPostUri of this.getFixedPostUris()) {
				feed.unshift({
					post: fixedPostUri,
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
