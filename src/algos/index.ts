import { AppContext } from '../config'
import {
	QueryParams,
	OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as whatsAlf from './whats-alf'
import * as cities from './cities'
import * as cat from './cat'
import * as newgearall from './newgearall'
import * as newgearja from './newgearja'
import * as skyfeedall from './skyfeedall'
import * as skyfeedja from './skyfeedja'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
	[whatsAlf.shortname]: whatsAlf.handler,
	[cities.shortname]: cities.handler,
	[cat.shortname]: cat.handler,
	[newgearall.shortname]: newgearall.handler,
	[newgearja.shortname]: newgearja.handler,
	[skyfeedall.shortname]: skyfeedall.handler,
	[skyfeedja.shortname]: skyfeedja.handler,
}

export default algos
