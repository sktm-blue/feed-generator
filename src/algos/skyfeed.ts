import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'

class AlgoImplAll extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'skyfeedall'
	}
	
	// 正規表現検索する場合の取得用ワード
	public getSearchWordForRegexpArray(): string[] {
		return [ 'skyfeed', 'builder' ]
	}
	// 正規表現検索時のパターン
	public getRegexpPattern(): string {
		return 'skyfeed|feed.{0,1}builder'
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
		return 'skyfeedja'
	}
	
	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ONLY_JA
	}
}

export const skyfeedall: AlgoAbstract = new AlgoImplAll()
export const skyfeedja: AlgoAbstract = new AlgoImplJa()
