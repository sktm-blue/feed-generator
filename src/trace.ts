/** デバッグモードかどうか。本番公開時にはfalseにする */
const DEBUG_MODE:boolean = true;

/**
 * デバッグモードが有効で、console.log()が使える時に、
 * コンソールに文字列を出力します。
 * @param {string[]} ...args 出力したい文字列です。
 */
export function trace(...args:any[]):void {
    if (DEBUG_MODE) {
        let str:string = "";
        if (args.length > 0)
            str = args.join(", ");

        console.log(str);
    }
}

export function traceerr(msg: string, error: any):void {
    if (DEBUG_MODE) {
        console.error(msg, error);
    }
}
