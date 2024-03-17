// このファイルは以下サイトのコードを使用させて頂いてます
// https://qiita.com/tonkotsuboy_com/items/7443ffb6351e6bd2526b

import fs from 'fs'
import { EnvValue } from './envvalue'

export class Trace {
    /**
     * デバッグモードが有効で、console.log()が使える時に、
     * コンソールに文字列を出力します。
     * @param {string[]} ...args 出力したい文字列です。
     */
    public static debug(...args: any[]): void {
        if (EnvValue.getInstance().debugMode) {
            const now: Date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000))  // 日本時間で取得
            let msg: string = ""
            if (args.length > 0) {
                msg = args.join(", ")
            }
            console.log(`[${this.getStandardStr(now)} ${process.pid} DEBUG] ${msg}`)
        }
    }

    public static info(...args: any[]): void {
        const now: Date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000))  // 日本時間で取得
        let msg: string = ""
        if (args.length > 0) {
            msg = args.join(", ")
        }
        const logStr: string = `[${this.getStandardStr(now)} ${process.pid} INFO ] ${msg}`
        console.log(logStr)
        fs.appendFile(`${this.getYmd(now)}.log`, logStr + '\n', err => { if ( err ) throw err })
    }

    public static error(msg: string, error: any = null): void {
        const now: Date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000))  // 日本時間で取得
        const logStr: string = `[${this.getStandardStr(now)} ${process.pid} ERROR] ${msg}`
        console.error(logStr, error)
        fs.appendFile(`${this.getYmd(now)}.log`, logStr + '\n', err => { if ( err ) throw err })
    }

    private static getStandardStr(now: Date): string {
        // 日時文字列を返す
        return `${this.getYmd(now)}-${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`
    }

    private static getYmd(now: Date): string {
        // yyyyMMdd形式の日付文字列を返す
        const monthNum: number = now.getMonth() + 1
        return `${now.getFullYear()}${monthNum.toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`
    }
}
