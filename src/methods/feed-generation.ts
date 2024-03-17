import { InvalidRequestError } from '@atproto/xrpc-server'
import { Server } from '../lexicon'
import { AppContext } from '../config'
import { Algos } from '../algos'
import { validateAuth } from '../auth'
import { AtUri } from '@atproto/syntax'
import { Trace } from '../trace'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
    const feedUri = new AtUri(params.feed)
		const algos: Algos = Algos.getInstance()
    const algo = algos.record[feedUri.rkey]
    if (
      feedUri.hostname !== ctx.cfg.publisherDid ||
      feedUri.collection !== 'app.bsky.feed.generator' ||
      !algo
    ) {
      throw new InvalidRequestError(
        'Unsupported algorithm',
        'UnsupportedAlgorithm',
      )
    }

    // Example of how to check auth if giving user-specific results:
    /*
    const requesterDid = await validateAuth(
      req,
      ctx.cfg.serviceDid,
      ctx.didResolver,
    )
    */

    const body = await algo(ctx, params)
    //const body = await algo(ctx, params, requesterDid)
    
    Trace.info('fg ' + feedUri.rkey)

    return {
      encoding: 'application/json',
      body: body,
    }
  })
}
