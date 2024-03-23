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
import { feedgen } from './feedgen'
import { sky } from './sky'
import { raftall, raftja } from './raft'
import { citiesall, citiesja } from './cities'
import { omegacraall, omegacraja } from './omegacra'
import { satisfactoryall, satisfactoryja } from './satisfactory'
import { palall, palja, palimageall, palimageja } from './pal'
import { supermarketall } from './supermarket'
import { dynastyall } from './dynasty'
import { toptags } from './toptags'

export class Algos {
	private algoArray: AlgoAbstract[] = [
		//cat,
		//newgearall,
		//newgearja,
		skyfeedall,
		skyfeedja,
		feedgen,
		sky,
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
		supermarketall,
		dynastyall,
		toptags,
		]

	// インスタンス
	private static _instance: Algos

	public readonly record: Record<string, AlgoAbstract> = {}
	public readonly searchTagArray: string[] = []
	public readonly searchWordForRegexpArray: string[] = []
	public readonly regexpArray: RegExp[] = []
	
	// プライベートコンストラクタ
	private constructor() {
		let tempSearchTagArray: string[] = []
		let tempSearchWordForRegexpArray: string[] = []
		for (const algo of this.algoArray) {
			this.record[algo.getShortname()] = algo

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

			const regexpPattern: string = algo.getRegexpPattern()
			if (regexpPattern.length > 0) {
				this.regexpArray.push(new RegExp(regexpPattern, 'i'))
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
}
