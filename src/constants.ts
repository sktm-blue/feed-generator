export class Constants {

    // 表示言語設定
    public static LANG_SWITCH = Object.freeze({
        ALL_LANG: 0,		// 言語指定なし
        ONLY_JA: 1,			// 日本語のみ
        ONLY_EN: 2,			// 英語のみ
    })

    // 言語番号
    public static LANG_NUMBER = Object.freeze({
        UNDEFINED: 0,		// 未定義
        JA: 1,				// 日本語
        EN: 2,				// 英語
        OTHER: 99,			// その他の言語
    })

    // 言語コード
    public static LANG_CODE = Object.freeze({
        JA: 'ja',				// 日本語
        EN: 'en',				// 英語
    })

    // 表示リプライ設定
    public static REPLY_SWITCH = Object.freeze({
        NO_REPLY: 0,			// 通常の投稿のみ(リプライなし)を表示
        REPLY_TO_OWN: 1,		// 通常の投稿と自分自身へのリプライを表示
        ALL_POST: 2,			// 全ての投稿を表示
    })

    // 投稿タイプ
    public static POST_TYPE = Object.freeze({
        NORMAL: 0,				// 通常の投稿(リプライなし)
        REPLY_TO_OWN: 1,		// 自分自身へのリプライ
        REPLY_TO_OTHER: 2,		// 他人へのリプライ
    })

	// 画像付き投稿表示設定
    public static IMAGE_SWITCH = Object.freeze({
        NO_IMAGE_ONLY: 0,		// 画像なしの投稿のみ表示
        EXISTS_IMAGE_ONLY: 1,	// 画像ありの投稿のみ表示
        ALL_POST: 2,			// 全ての投稿を表示
    })

}
