import { AlgoAbstract } from './algo-abstract'
import { Constants } from '../constants'

class AlgoImplAll extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'palall'
	}
	
	// ハッシュタグで検索する場合のタグ(「#」は不要)
	public getTagArray(): string[] {
		return [
			 'palworld', 
			 'パルワールド',
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
		return 'palja'
	}

	// 表示言語設定
	protected getLangSwitch(): number {
		return Constants.LANG_SWITCH.ONLY_JA
	}
}

class AlgoImplImageJa extends AlgoImplJa {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'palimageja'
	}

	// 画像付き投稿表示設定
	protected getImageSwitch(): number {
		return Constants.IMAGE_SWITCH.EXISTS_IMAGE_ONLY
	}
}

export const palall: AlgoAbstract = new AlgoImplAll()
export const palja: AlgoAbstract = new AlgoImplJa()
export const palimageja: AlgoAbstract = new AlgoImplImageJa()
