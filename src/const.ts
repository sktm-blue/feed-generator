
type InsertData = { query: string; maxLoop: number };

// 検索ワードのリスト
export const INSERT_WORDS: InsertData[] = [
	{ query: 'feed', maxLoop: 10 },
	{ query: 'フィード', maxLoop: 10 },
	{ query: 'raft', maxLoop: 1 },
	{ query: 'ラフト', maxLoop: 1 },
	{ query: 'cities', maxLoop: 1 },
	{ query: 'シティーズ', maxLoop: 1 },
	{ query: 'omega', maxLoop: 1 },
	{ query: 'オメガクラフター', maxLoop: 1 },
	{ query: 'satisfactory', maxLoop: 1 },
	{ query: 'サティスファクトリー', maxLoop: 1 },
	{ query: 'palworld', maxLoop: 10 },
	{ query: 'パルワ', maxLoop: 10 },
]

// 検索アカウントのリスト
export const INSERT_ACTORS: InsertData[] = [
	{ query: 'did:plc:dalmbmm5x75vfp3gysgp3vzl', maxLoop: 1 },	// SkyFeed App
	{ query: 'did:plc:odo2zkpujsgcxtz7ph24djkj', maxLoop: 1 },	// redsolverさん
]

// リプライをどの程度表示するか
export const REPLY_FLAG = Object.freeze({
    NO_DISPLAY: 0,		// 表示しない
    ONLY_OWN_REPLY: 1,	// 自分自身へのリプライを表示
    ALL_REPLY: 2,		// 全てのリプライを表示
})
