import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'cities'
//const likeStr = 'cities.{0,3}skylines|シティーズ.{0,1}スカイライン'
//const likeStr = 'cities\.{0,3}skylines\|シティーズ\.{0,1}スカイライン'
const likeStr = 'cities'
//const likeStr = '%cities skylines%'
//const notLikeStr = ''

export const handler = async (ctx: AppContext, params: QueryParams) => {

	console.log('A');

	let builder = ctx.db
		.selectFrom('post')
		.selectAll()
		.where('text', 'regexp', likeStr) // DBに取り込んだ投稿からさらにフィルタリングの条件を追加
		//.where('text', 'like', likeStr) // DBに取り込んだ投稿からさらにフィルタリングの条件を追加
		.orderBy('indexedAt', 'desc')
		.orderBy('cid', 'desc')
		.limit(params.limit)

	//    .where('text', 'like', likeStr) // DBに取り込んだ投稿からさらにフィルタリングの条件を追加
	//    .where('text', 'not like', notLikeStr) // 特定の文字列を除外もできる
	//    .where('text', "regexp", likeStr) // DBに取り込んだ投稿からさらにフィルタリングの条件を追加

	console.log('B');

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

	console.log('C');

	const res = await builder.execute()

	console.log(res.length);

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