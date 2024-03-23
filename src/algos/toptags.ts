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

	// URI一覧構築
	public async handler(ctx: AppContext, params: QueryParams, requester: string = '') {

		let startTime: number
		let endTime: number
		
		Trace.debug('handler 1 requester = ' + requester)
		startTime = performance.now()
		if (requester.length == 0) {
			throw new Error('requester is empty')
		}

		const env: EnvValue = EnvValue.getInstance()
		const agent = new AtpAgent({ service: env.bskyServiceUrl })
		await agent.login({ identifier: env.publisherHandle, password: env.publisherAppPassword })
		endTime = performance.now()
		Trace.debug('handler 2 time = ' + (endTime - startTime))
		startTime = endTime

		// APIのgetAuthorFeedを実行する
		//const response = await ctx.agent.api.app.bsky.feed.getAuthorFeed({ actor, limit: 100, cursor: '' })
		const response = await agent.api.app.bsky.feed.getAuthorFeed({ actor: requester, limit: 100, cursor: '' })
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
		const tagCount: number = (sortedTagCountMap.size < 10 ? sortedTagCountMap.size : 10)

		let feed: any[] = []
		let i: number = 0
		for (const [key, value] of sortedTagCountMap) {
			feed.push({ post: value.uri })
			i++
			if (i >= tagCount) {
				break
			}
		}

		endTime = performance.now()
		Trace.debug('handler 5 time = ' + (endTime - startTime))
		startTime = endTime
		return {
			cursor : '',
			feed,
		}
		
		/* 上位ハッシュタグを投稿しようとしたが、うまくリンクが張られない
		let postText: string = '#hashtag Your hashtag top' + tagCount + '\n'
		let i: number = 1
		let facets: Facet[] = []
		const text = new UnicodeString(postText)

		const re = /(?:^|\s)(#[^\d\s]\S*)(?=\s)?/g
		let match
		let tags: string[] = []
		while ((match = re.exec(text.utf16))) {
		  let [tag] = match
		  const hasLeadingSpace = /^\s/.test(tag)
	
		  tag = tag.trim().replace(/\p{P}+$/gu, '') // strip ending punctuation
	
		  // inclusive of #, max of 64 chars
		  if (tag.length > 66) continue
	
		  const index = match.index + (hasLeadingSpace ? 1 : 0)
	
		  const tag2: string = tag.replace(/^#/, '')
		  const tagobj: FacetTag = { tag: tag2 }
		  facets.push({
			//$type: 'app.bsky.richtext.facet',
			index: {
			  byteStart: text.utf16IndexToUtf8Index(index),
			  byteEnd: text.utf16IndexToUtf8Index(index + tag.length), // inclusive of last char
			},
			features: [
			  //{
				//$type: 'app.bsky.richtext.facet#tag',
				//tag: tag.replace(/^#/, ''),
			  //},
			  tagobj,
			],
		  })
		  tags.push(tag2)
		}
		*/		
		/*
		const ptu = new UnicodeString(postText)
		const be = ptu.utf16IndexToUtf8Index(7) + 1
		facets.push({
			index: {
				byteStart : 0,
				byteEnd : be,
			},
			features: [{
				tag: 'hashtag',
				$type: 'app.bsky.richtext.facet#tag',
			}],
		})


		for (const [key, value] of sortedTagCountMap) {
			Trace.debug('key = ' + key + ', value = ' + value)
			//postText += ` ${i} : #${key} (${value})\n`
			postText += ' ' + i + ' : '

			const byteStart = (new TextEncoder()).encode(postText).byteLength;
    		const byteEnd = byteStart + (new TextEncoder()).encode(key).byteLength + 1;
			const byteSlice = {
				byteStart,
				byteEnd,
			}
			facets.push({
				index: byteSlice,
				features: [{
					tag: key,
					$type: 'app.bsky.richtext.facet#tag',
				}],
			})
			postText += '#' + key + ' (' + value + ')\n'

			i++
			if (i > tagCount) {
				break
			}
		}

		const agent2 = new BskyAgent({ service: env.bskyServiceUrl })
		await agent2.login({ identifier: '', password: '' })

		const postRes = await agent2.post({
			//$type: 'app.bsky.feed.post',
			text: postText,
			fasets: facets,
			//tags,
			createdAt: new Date().toISOString()
		  })

		Trace.debug('handlerFt 5 uri = ' + postRes.uri)
		const uri = postRes.uri
		//const uri = ''
		let feed = [{ post: uri }]
		const cursor = ''
		return {
			cursor,
			feed,
		}
		*/
	}
}

export const toptags: AlgoAbstract = new AlgoImpl()
