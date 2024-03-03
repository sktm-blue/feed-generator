import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'

class AlgoImplAll extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'raftall'
	}
	
	// ハッシュタグで検索する場合のタグ(「#」は不要)
	public getTagArray(): string[] {
		return [
			 'raft', 
			 'ラフト',
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

class AlgoImplJa extends AlgoImplAll {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'raftja'
	}

	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ONLY_JA
	}
}

export const raftall: AlgoAbstract = new AlgoImplAll()
export const raftja: AlgoAbstract = new AlgoImplJa()
