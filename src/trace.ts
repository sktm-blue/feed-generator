// このファイルは以下サイトのコードを使用させて頂いてます
// https://qiita.com/tonkotsuboy_com/items/7443ffb6351e6bd2526b

/**
 * デバッグモードが有効で、console.log()が使える時に、
 * コンソールに文字列を出力します。
 * @param {string[]} ...args 出力したい文字列です。
 */
export function trace(...args:any[]):void {
    if (process.env.FEEDGEN_TRACE_ENABLE === 'true') {
        let str:string = "";
        if (args.length > 0)
            str = args.join(", ");

        console.log(str);
    }
}

export function traceerr(msg: string, error: any):void {
    if (process.env.FEEDGEN_TRACE_ENABLE === 'true') {
        console.error(msg, error);
    }
}
