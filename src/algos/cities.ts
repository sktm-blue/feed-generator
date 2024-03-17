import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'
import { Database } from '../db';

class AlgoImplAll extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'citiesall'
	}
	
	// 正規表現検索する場合の取得用ワード
	public getSearchWordForRegexpArray(): string[] {
		return [ 'skylines', 'シティーズ' ]
	}
	// 正規表現検索時のパターン
	public getRegexpPattern(): string {
		return 'cities.{0,3}skylines|[^オ]シティーズ'
	}

	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ALL_LANG
	}

	// 表示リプライ設定
	protected getReplySwitch(): number {
		return Constants.REPLY_SWITCH.REPLY_TO_OWN
	}
}

class AlgoImplJa extends AlgoImplAll {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'citiesja'
	}
	
	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ONLY_JA
	}
}

export const citiesall: AlgoAbstract = new AlgoImplAll()
export const citiesja: AlgoAbstract = new AlgoImplJa()
