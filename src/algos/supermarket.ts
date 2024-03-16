import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'
import { Database } from '../db';
import { expressionBuilder } from 'kysely'

class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'supermarketall'
	}
	
	// 正規表現検索する場合の取得用ワード
	public getSearchWordForRegexpArray(): string[] {
		return [ 'supermarket', 'スーパーマーケット' ]
	}
	// 正規表現クエリを追加
	// シンプルな検索をする場合は return builder.where('text', 'regexp', '(パターン)')
	protected addRegexpQuery(builder: any, db: Database): any {
		return builder.where((eb) =>
			eb('text', 'regexp', 'supermarket.*simu(l|r)ator').or('text', 'regexp', 'スーパーマーケット.*シ(ミュ|ュミ)レータ')
		)
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

export const supermarketall: AlgoAbstract = new AlgoImpl()
