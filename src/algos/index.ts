import { AppContext } from '../config'
import {
	QueryParams,
	OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as whatsAlf from './whats-alf'
import * as cities from './citiesja'
import * as cat from './cat'
import * as newgearall from './newgearall'
import * as newgearja from './newgearja'
import * as skyfeedall from './skyfeedall'
import * as skyfeedja from './skyfeedja'
import * as raftja from './raftja'
import * as citiesja from './citiesja'
import * as omegacraall from './omegacraall'
import * as omegacraja from './omegacraja'
import * as satisfactoryja from './satisfactoryja'
import * as palimageja from './palimageja'

type AlgoHandler = (ctx: AppContext, params: QueryParams, requester: string) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
//	[whatsAlf.shortname]: whatsAlf.handler,
//	[cat.shortname]: cat.handler,
//	[newgearall.shortname]: newgearall.handler,
//	[newgearja.shortname]: newgearja.handler,
	[skyfeedall.shortname]: skyfeedall.handler,
	[skyfeedja.shortname]: skyfeedja.handler,
	[raftja.shortname]: raftja.handler,
	[citiesja.shortname]: citiesja.handler,
	[omegacraall.shortname]: omegacraall.handler,
	[omegacraja.shortname]: omegacraja.handler,
	[satisfactoryja.shortname]: satisfactoryja.handler,
	[palimageja.shortname]: palimageja.handler,
}

export default algos
