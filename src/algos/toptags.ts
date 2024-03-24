import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'
import { Database } from '../db';
import { expressionBuilder } from 'kysely'
import { EnvValue } from '../envvalue'
import { AtpAgent, BlobRef, BskyAgent, RichText, Facet, FacetTag, UnicodeString } from '@atproto/api'
import * as AppBskyFeedPost from '../lexicon/types/app/bsky/feed/post'
import { Util } from '../util'
import { Trace } from '../trace';
import { UpdateOutputFileStampsProject } from 'typescript';

//const encoder = new TextEncoder()
//const decoder = new TextDecoder()

type TagValue = {
	uri: string, 
	count: number
}

// toptags : フィードを見た人の直近の投稿からハッシュタグを抽出し、よく使うタグの最新投稿一覧を返すフィード
class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'toptags'
	}
	// 認証を必要とするフィードかどうか
	public getAuthFlag(): boolean {
		return true
	}

	private readonly MAX_TAGS: number = 10
	//private readonly BOT_HANDLER: string = ''
	//private readonly BOT_PASSWORD: string = ''

	//private botAgent: BskyAgent | undefined = undefined

	// URI一覧構築
	public async handler(ctx: AppContext, params: QueryParams, requester: string = '') {

		let startTime: number
		let endTime: number
		const env: EnvValue = EnvValue.getInstance()
		
		Trace.debug('handler 1 requester = ' + requester)
		startTime = performance.now()
		if (requester.length == 0) {
			throw new Error('requester is empty')
		}

		// ログイン
		//if (this.botAgent === undefined) {
		//	this.botAgent = new BskyAgent({ service: env.bskyServiceUrl })
		//	Trace.debug('this.botAgent new BskyAgent')
		//}
		//Trace.debug('this.botAgent hasSession = ' + this.botAgent.hasSession)
		//if (!this.botAgent.hasSession) {
		//	const responseLogin = await this.botAgent.login({ identifier: this.BOT_HANDLER, password: this.BOT_PASSWORD })
		//	Trace.debug('this.botAgent responseLogin = ' + responseLogin.success)
		//}
		//endTime = performance.now()
		//Trace.debug('handler 2 time = ' + (endTime - startTime))
		//startTime = endTime

		// APIのgetAuthorFeedを実行する
		const response = await ctx.agent.api.app.bsky.feed.getAuthorFeed({ actor: requester, limit: 100, cursor: '' })
		endTime = performance.now()
		Trace.debug('handler 3 time = ' + (endTime - startTime))
		startTime = endTime

		let tagCountMap = new Map<string, TagValue>()
		for (const feedViewPost of response.data.feed) {
			if (AppBskyFeedPost.isRecord(feedViewPost.post.record)) {
				const textLower = feedViewPost.post.record.text.toLowerCase()
				const tagArray: string[] = Util.findHashtags(textLower)
				for (const tag of tagArray) {
					const value: TagValue | undefined = tagCountMap.get(tag)
					if (value === undefined) {
						tagCountMap.set(tag, { uri: feedViewPost.post.uri, count: 1 })
					} else {
						tagCountMap.set(tag, { uri: value.uri, count: value.count + 1 })
					}
				}
			}
		}
		endTime = performance.now()
		Trace.debug('handler 4 time = ' + (endTime - startTime))
		startTime = endTime

		// tagCountMapをvalueで降順ソートする
		const sortedTagCountMap: Map<string, TagValue> = new Map([...tagCountMap].sort((a, b) => b[1].count - a[1].count))

		// tagCountMapの先頭からURIを格納
		let feed: any[] = []
		let rank: number = 1
		const tagCount: number = (sortedTagCountMap.size < this.MAX_TAGS ? sortedTagCountMap.size : this.MAX_TAGS)
		//let postText: string = 'Your hashtag top' + tagCount + '\n'
		for (const [key, value] of sortedTagCountMap) {
			//postText += ` ${rank} : #${key} (${value.count})\n`
			feed.push({ post: value.uri })

			rank++
			if (rank > tagCount) {
				break
			}
		}
		// 固定ポストを先頭に挿入
		//var rt = new RichText({ text: postText })
		//await rt.detectFacets( this.botAgent )	  
		//var res = await this.botAgent.post({
		//  $type: 'app.bsky.feed.post',
		//  text: rt.text,
		//  facets: rt.facets,
		//  langs: ['ja'],
		//  createdAt: new Date().toISOString()
		//})
		//Trace.debug('res.uri = ' + res.uri)
		//feed.unshift({ post: res.uri })
		endTime = performance.now()
		Trace.debug('handler 5 time = ' + (endTime - startTime))
		startTime = endTime

		return {
			cursor: '',
			feed,
		}
	}
}

export const toptags: AlgoAbstract = new AlgoImpl()
