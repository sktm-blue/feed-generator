import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'

class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'sky'
	}
	
	// ハッシュタグで検索する場合のタグ(「#」は不要)
	public getTagArray(): string[] {
		return [
			 'イマソラ', 
			 'アサソラ',
			 'イマクモ',
			 '空',
			 '青空',
			 '雲',
			 '空が好き',
			 '雲が好き',
		]
	}

	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ONLY_JA
	}

	// 表示リプライ設定
	protected getReplySwitch(): number {
		return Constants.REPLY_SWITCH.REPLY_TO_OWN
	}

	// 画像付き投稿表示設定
	protected getImageSwitch(): number {
		return Constants.IMAGE_SWITCH.EXISTS_IMAGE_ONLY
	}
}

export const sky: AlgoAbstract = new AlgoImpl()
