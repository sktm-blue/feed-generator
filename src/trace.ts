// このファイルは以下サイトのコードを使用させて頂いてます
// https://qiita.com/tonkotsuboy_com/items/7443ffb6351e6bd2526b

import fs from 'fs'

export class Trace {
    /**
     * デバッグモードが有効で、console.log()が使える時に、
     * コンソールに文字列を出力します。
     * @param {string[]} ...args 出力したい文字列です。
     */
    public static debug(...args: any[]): void {
        if (process.env.FEEDGEN_DEBUG_MODE === 'true') {
            const now = new Date();
            let msg: string = ""
            if (args.length > 0) {
                msg = args.join(", ")
            }
            console.log(`[${this.getYmdHms(now)} DEBUG] ${msg}`)
        }
    }

    public static info(...args: any[]): void {
        const now = new Date();
        let msg: string = ""
        if (args.length > 0) {
            msg = args.join(", ")
        }
        const logStr: string = `[${this.getYmdHms(now)} INFO ] ${msg}`
        console.log(logStr)
        fs.appendFileSync(`${this.getYmd(now)}.log`, logStr + '\n')
    }

    public static error(msg: string, error: any = null): void {
        const now = new Date();
        const logStr: string = `[${this.getYmdHms(now)} ERROR] ${msg}`
        console.error(logStr, error)
        fs.appendFileSync(`${this.getYmd(now)}.log`, logStr + '\n')
    }

    private static getYmdHms(now: Date): string {
        // yyyyMMddHHmmdd形式の日時文字列を返す
        return now.toISOString().replace(/\..+|[^0-9]/g, '')
    }

    private static getYmd(now: Date): string {
        // yyyyMMdd形式の日付文字列を返す
        return now.toISOString().replace(/T.*|[^0-9]/g, '')
    }
}
