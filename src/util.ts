import { AtUri } from '@atproto/syntax'
import { Constants } from './constants'
import { Trace } from './trace'

export class Util {
	// 与えられた文字列からハッシュタグを抽出する
	// この関数は以下サイトのコードを使用させて頂いてます
	// https://note.com/zak5/n/n8c656edaf533
	public static findHashtags(searchText: string): string[] {
		//const regexp: RegExp = /\B#\w\w+\b/g			// この方法では全角のタグがヒットしない
		const regexp: RegExp = /#(\w|[^\x01-\x7E])+(\s|　|$)/g
		const result: RegExpMatchArray | null = searchText.match(regexp)
		let tagArray: string[] = []
		if (result) {
			for (const matchStr of result) {
				let tag: string = matchStr.replace(/(\s|　)/g, '');		// 空白文字を取り除く
				tagArray.push(tag)
			}
		}
		return this.removeHashtagSharp(tagArray)
	}

	// 文字列配列に先頭の「#」を付加する
	public static addHashtagSharp(wordArray: string[]): string[] {
		let hashTagArray: string[] = []
		for (const word of wordArray) {
			hashTagArray.push(word.indexOf('#') == 0 ? word : ('#' + word))
		}
		return hashTagArray
	}

	// 文字列配列から先頭の「#」を削除する
	public static removeHashtagSharp(hashtagArray: string[]): string[] {
		let wordArray: string[] = []
		for (const hashtag of hashtagArray) {
			wordArray.push(hashtag.indexOf('#') == 0 ? hashtag.slice(1) : hashtag)
		}
		return wordArray
	}

	// 言語情報
	public static getLangs(langStrArray: string[] | undefined): number[] {
		//traceDebug('langs start create.record.langs.length = ' + create.record.langs?.length)
		let langs: number[] = [
			Constants.LANG_NUMBER.UNDEFINED, 
			Constants.LANG_NUMBER.UNDEFINED, 
			Constants.LANG_NUMBER.UNDEFINED
		]
		if (langStrArray !== undefined) {
			for (let i: number = 0; i < langs.length; i++) {
				if (i < langStrArray.length) {
					Trace.debug(langStrArray[i])   // jaやenが出力される
					if (langStrArray[i].length > 0) {
						if (langStrArray[i] == Constants.LANG_CODE.JA) {
							langs[i] = Constants.LANG_NUMBER.JA
						} else if (langStrArray[i] == Constants.LANG_CODE.EN) {
							langs[i] = Constants.LANG_NUMBER.EN
						} else {
							langs[i] = Constants.LANG_NUMBER.OTHER
						}
					}
				}
			}
		}
		//traceDebug('langs end')
		return langs
	}

	// 投稿タイプ
	public static getPostType(uri: string, parentUri: string | null): number {
		let postType: number = Constants.POST_TYPE.NORMAL
		if (parentUri != null && parentUri.length > 0) {
			if (parentUri.includes(new AtUri(uri).hostname)) {
				postType = Constants.POST_TYPE.REPLY_TO_OWN
			} else {
				postType = Constants.POST_TYPE.REPLY_TO_OTHER
			}
		}
		return postType
	}
}
