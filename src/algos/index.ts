import { AppContext } from '../config'
import {
	QueryParams,
	OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AlgoAbstract } from './algo-abstract'

//import { whatsAlf } from './whats-alf'
//import { cities } from './citiesja'
//import { cat } from './cat'
import { newgearall } from './newgearall'
import { newgearja } from './newgearja'
import { skyfeedall } from './skyfeedall'
import { skyfeedja } from './skyfeedja'
import { raftja } from './raftja'
import { citiesja } from './citiesja'
import { omegacraall } from './omegacraall'
import { omegacraja } from './omegacraja'
import { satisfactoryja } from './satisfactoryja'
import { palimageja } from './palimageja'

const algoArray: AlgoAbstract[] = [
	newgearall,
	newgearja,
	skyfeedall,
	skyfeedja,
	raftja,
	citiesja,
	omegacraall,
	omegacraja,
	satisfactoryja,
	palimageja,
]

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

export function getAlgos(): Record<string, AlgoHandler> {
	let record: Record<string, AlgoHandler> = {}
	for (const algo of algoArray) {
		record[algo.getShortname()] = algo.handler
	}
	return record
}

