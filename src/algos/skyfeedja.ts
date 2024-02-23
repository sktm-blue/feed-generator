import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { REPLY_FLAG } from '../const'
import { trace, traceerr } from '../trace'

// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
// max 15 chars
export const shortname: string = 'skyfeedja'

// 固定ポストのURI
// 取得方法は、SkyFeedで該当ポストを開き、Copy JSONで得られるJSON内のuriをコピーする
// 画面ではこの配列の逆順に表示される(一番下のものが一番上に表示される)
const fixedPostUris: string[] = [
	'at://did:plc:wdoyybvxbazpbpxpvyntlzsq/app.bsky.feed.post/3klcbmbb2r623'
]

// リプライを表示させるか
// REPLY_FLAG.NO_DISPLAY : 表示させない
// REPLY_FLAG.ONLY_OWN_REPLY : 自分自身へのリプライのみ表示させる
// REPLY_FLAG.ALL_REPLY : 全てのリプライを表示させる
const replyFlag: number = REPLY_FLAG.ONLY_OWN_REPLY

export const handler = async (ctx: AppContext, params: QueryParams) => {

	// DBから指定した条件のポストを検索する
	// ここの「.selectAll()」と「.limit(params.limit)」の間に検索条件を書く
	// .where('lang1', '=', 'ja')		-> 日本語の投稿のみ
	// .where('text', 'like', likeStr) 	-> 部分一致検索
	// .orderBy('indexedAt', 'desc')	-> 日時でソート(降順)
	// .orderBy('cid', 'desc')			-> cidでソート(降順)
	// ※DBへの格納時に小文字への変換を行っているため、ここでは大文字小文字の処理をしない
	let builder = ctx.db
		.selectFrom('post')
		.selectAll()
		// 日本語で「skyfeed」を含む投稿か、SkyFeed Appの投稿か、redsolverさんの投稿を抽出する
		.where(({ eb, or, and }) => or([
			and([
				eb('lang1', '=', 'ja'),				// 日本語の投稿のみv
				//eb('text', 'like', '%skyfeed%') 		// 部分一致検索
				eb('text', 'regexp', 'skyfeed|bluefeed') 		// 部分一致検索
			]),
			eb('uri', 'like', 'at://did:plc:dalmbmm5x75vfp3gysgp3vzl%'),	// SkyFeed App
			eb('uri', 'like', 'at://did:plc:odo2zkpujsgcxtz7ph24djkj%')		// redsolverさん
		]))
		.orderBy('indexedAt', 'desc')	// 日時でソート(降順)
		.orderBy('cid', 'desc')			// cidでソート(降順)
		.limit(params.limit)

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
		if (replyFlag == REPLY_FLAG.ALL_REPLY) {
			return true		// リプライであるかないかに関わらず全て表示させる
		} else {
			if (row.replyParent != null && row.replyParent.length > 0) {
				// リプライの場合
				if (replyFlag == REPLY_FLAG.ONLY_OWN_REPLY) {
					const splitIndex: number = row.uri.indexOf('app.bsky')
					const splitStr: string = row.uri.substring(0, splitIndex)
					return row.replyParent.includes(splitStr)	// 自分自身へのリプライの場合は表示させる
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
		trace(resItem.text)
		trace('------------------------------')
	}
	*/
	// ***

	const feed = filteredRes.map((row) => ({
		post: row.uri,
	}))

	// 固定ポストを先頭に挿入
	if (params.cursor === undefined) {
		for (const fixedPostUri of fixedPostUris) {
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