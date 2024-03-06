import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'

class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'cat'
	}
	
	// ハッシュタグで検索する場合のタグ(「#」は不要)
	public getTagArray(): string[] {
		return [
			 '猫', 
			 '犬',
			 'ff14',
			 '青空ごはん部',
			 'art',
			 'イラスト',
		]
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

export const cat: AlgoAbstract = new AlgoImpl()
