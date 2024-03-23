import { InvalidRequestError } from '@atproto/xrpc-server'
import { Server } from '../lexicon'
import { AppContext } from '../config'
import { Algos } from '../algos'
import { validateAuth } from '../auth'
import { AtUri } from '@atproto/syntax'
import { EnvValue } from '../envvalue'
import { Trace } from '../trace'
import { AlgoAbstract } from '../algos/algo-abstract'

export default function (server: Server, ctx: AppContext) {
	server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
		const feedUri = new AtUri(params.feed)
		const algos: Algos = Algos.getInstance()
		const algo: AlgoAbstract = algos.record[feedUri.rkey]
		if (
			feedUri.hostname !== ctx.cfg.publisherDid ||
			feedUri.collection !== 'app.bsky.feed.generator'
		) {
			throw new InvalidRequestError(
				'Unsupported algorithm',
				'UnsupportedAlgorithm',
			)
		}

		const startTime: number = performance.now()
		let body: any
		if (algo.getAuthFlag()) {
			let requesterDid: string = ''
			const env = EnvValue.getInstance()
			if (env.authDebugMode) {
				requesterDid = env.publisherDid
			} else {
				requesterDid = await validateAuth(
					req,
					ctx.cfg.serviceDid,
					ctx.didResolver,
				)
			}
			body = await algo.handler(ctx, params, requesterDid)
		} else {
			body = await algo.handler(ctx, params)
		}

		Trace.info(`fg ${feedUri.rkey} time = ${performance.now() - startTime} ms`)

		return {
			encoding: 'application/json',
			body: body,
		}
	})
}
