import { AppContext } from '../config'
import {
	QueryParams,
	OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { Util } from '../util'
import { Constants } from '../constants'
import { Trace } from '../trace'

import { AlgoAbstract } from './algo-abstract'
//import { whatsAlf } from './whats-alf'
import { cat } from './cat'
import { newgearall, newgearja } from './newgear'
import { skyfeedall, skyfeedja } from './skyfeed'
import { raftall, raftja } from './raft'
import { citiesall, citiesja } from './cities'
import { omegacraall, omegacraja } from './omegacra'
import { satisfactoryall, satisfactoryja } from './satisfactory'
import { palall, palja, palimageall, palimageja } from './pal'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

export class Algos {
	// インスタンス
	private static _instance: Algos

	private algoArray: AlgoAbstract[] = [
		//cat,
		//newgearall,
		//newgearja,
		//skyfeedall,
		//skyfeedja,
		raftall,
		raftja,
		citiesall,
		citiesja,
		omegacraall,
		omegacraja,
		satisfactoryall,
		satisfactoryja,
		palall,
		palja,
		palimageall,
		palimageja,
	]

	private record: Record<string, AlgoHandler> = {}
	private searchTagArray: string[] = []
	private searchWordForRegexpArray: string[] = []

	// プライベートコンストラクタ
	private constructor() {
		let tempSearchTagArray: string[] = []
		let tempSearchWordForRegexpArray: string[] = []
		for (const algo of this.algoArray) {
			this.record[algo.getShortname()] = algo.handler

			const algoTagArray: string[] | null = algo.getTagArray()
			if (algoTagArray != null) {
				for (const tag of algoTagArray) {
					tempSearchTagArray.push(tag)
				}
			}
			const algoWordArray: string[] | null = algo.getSearchWordForRegexpArray()
			if (algoWordArray != null) {
				for (const word of algoWordArray) {
					tempSearchWordForRegexpArray.push(word)
				}
			}
		}

		// 重複を削除
		this.searchTagArray = [...new Set(tempSearchTagArray)]
		this.searchWordForRegexpArray = [...new Set(tempSearchWordForRegexpArray)]
	}

	// インスタンスの取得
	public static getInstance(): Algos {
		// _inctanceが存在しない場合に、new Algos()を実行する。
		if (!this._instance) {
			this._instance = new Algos();
		}

		// 生成済みのインスタンスを返す
		return this._instance;
	}

	public getAlgos(): Record<string, AlgoHandler> {
		return this.record
	}

	public getAlgoHandler(shortName: string): AlgoHandler {
		return this.record[shortName]
	}

	public getSearchTagArray(): string[] {
		return this.searchTagArray
	}

	public getSearchWordForRegexpArray(): string[] {
		return this.searchWordForRegexpArray
	}
}
