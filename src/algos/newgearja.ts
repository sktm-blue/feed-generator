import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'newgearja'

export const handler = async (ctx: AppContext, params: QueryParams) => {

	// DBから指定した条件のポストを検索する
	// ここの「.selectAll()」と「.limit(params.limit)」の間に検索条件を書く
	// .where('lang1', '=', 'ja')		-> 日本語の投稿のみ
	// .where('text', 'like', likeStr) 	-> 部分一致検索
	// .orderBy('indexedAt', 'desc')	-> 日時でソート(降順)
	// .orderBy('cid', 'desc')			-> cidでソート(降順)
	let builder = ctx.db
		.selectFrom('post')
		.selectAll()
		.where('lang1', '=', 'ja')		// 日本語の投稿のみ
		.where('text', 'like', '%new gear%') // 部分一致検索
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

	const feed = res.map((row) => ({
		post: row.uri,
	}))

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
