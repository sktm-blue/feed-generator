// このファイルは以下サイトのコードを使用させて頂いてます
// https://qiita.com/tonkotsuboy_com/items/7443ffb6351e6bd2526b

import fs from 'fs'

/**
 * デバッグモードが有効で、console.log()が使える時に、
 * コンソールに文字列を出力します。
 * @param {string[]} ...args 出力したい文字列です。
 */
export function traceDebug(...args:any[]): void {
    if (process.env.FEEDGEN_DEBUG_MODE === 'true') {
        const now = new Date();
        let msg:string = ""
        if (args.length > 0) {
            msg = args.join(", ")
        }
        console.log(`[${getYmdHms(now)} DEBUG] ${msg}`)
    }
}

export function traceInfo(...args:any[]): void {
    const now = new Date();
    let msg:string = ""
    if (args.length > 0) {
        msg = args.join(", ")
    }
    const logStr: string = `[${getYmdHms(now)} INFO ] ${msg}`
    console.log(logStr)
    fs.appendFileSync(`${getYmd(now)}.log`, logStr + '\n')
}

export function traceError(msg: string, error: any = null): void {
    const now = new Date();
    const logStr: string = `[${getYmdHms(now)} ERROR] ${msg}`
    console.error(logStr, error)
    fs.appendFileSync(`${getYmd(now)}.log`, logStr + '\n')
}

function getYmdHms(now: Date): string {
    // yyyyMMddHHmmdd形式の日時文字列を返す
    return now.toISOString().replace(/\..+|[^0-9]/g,'')
}

function getYmd(now: Date): string {
    // yyyyMMdd形式の日付文字列を返す
    return now.toISOString().replace(/T.*|[^0-9]/g,'')
}