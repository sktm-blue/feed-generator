import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'
import { Database } from '../db';
import { expressionBuilder } from 'kysely'

class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'feedgen'
	}
	
	// 正規表現検索する場合の取得用ワード
	public getSearchWordForRegexpArray(): string[] {
		return [ 'feedgen', 'generator', 'フィードサーバ', 'フィードジェネレータ' ]
	}
	// 正規表現検索時のパターン
	public getRegexpPattern(): string {
		return '[^=]feedgen|feed.{0,1}generator|フィード(サーバ|ジェネレータ)'
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

export const feedgen: AlgoAbstract = new AlgoImpl()
