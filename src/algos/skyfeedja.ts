import { REPLY_FLAG } from '../const'
import { AlgoAbstract } from './algo-abstract'
import { Database } from '../db';

class AlgoImpl extends AlgoAbstract {
	// Blueskyからフィードサーバーにリクエストを投げる時使用される短い名前
	// max 15 chars
	public getShortname(): string {
		return 'skyfeedja'
	}
	
	// 固定ポストのURI
	// 取得方法は、SkyFeedで該当ポストを開き、Copy JSONで得られるJSON内のuriをコピーする
	// 画面ではこの配列の逆順に表示される(一番下のものが一番上に表示される)
	protected getFixedPostUris(): string[] {
		return []
	}

	// リプライを表示させるか
	// REPLY_FLAG.NO_DISPLAY : 表示させない
	// REPLY_FLAG.ONLY_OWN_REPLY : 自分自身へのリプライのみ表示させる
	// REPLY_FLAG.ALL_REPLY : 全てのリプライを表示させる
	protected getReplyFlag(): number {
		return REPLY_FLAG.ONLY_OWN_REPLY
	}
	
	// 検索条件を記述
	// .where('lang1', '=', 'ja')		-> 日本語の投稿のみ
	// .where('text', 'like', '%ラーメン%') 	-> 部分一致検索
	// .where('text', 'regexp', 'うどん|そば') 	-> 正規表現検索
	// .orderBy('indexedAt', 'desc')	-> 日時でソート(降順)
	// .orderBy('cid', 'desc')			-> cidでソート(降順)
	// ※DBへの格納時に小文字への変換を行っているため、ここでは大文字小文字の処理をしない
	protected getBuilder(db: Database): any {
		return db
			.selectFrom('post')
			.selectAll()
			// 日本語で「skyfeed」を含む投稿か、SkyFeed Appの投稿か、redsolverさんの投稿を抽出する
			.where(({ eb, or, and }) => or([
				and([
					eb('lang1', '=', 'ja'),				// 日本語の投稿のみ
					eb('text', 'like', '%skyfeed%') 	// 部分一致検索
				]),
				eb('uri', 'like', 'at://did:plc:dalmbmm5x75vfp3gysgp3vzl%'),	// SkyFeed App
				eb('uri', 'like', 'at://did:plc:odo2zkpujsgcxtz7ph24djkj%')		// redsolverさん
			]))
			.orderBy('indexedAt', 'desc')	// 日時でソート(降順)
			.orderBy('cid', 'desc')			// cidでソート(降順)
	}
}

export const skyfeedja: AlgoAbstract = new AlgoImpl()
