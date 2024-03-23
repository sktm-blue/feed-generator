import dotenv from 'dotenv'
import { Util } from './util'

export class EnvValue {
	// インスタンス
	private static _instance: EnvValue

	// メンバ
	public readonly port: number
	public readonly listenHost: string
	public readonly sqliteLocation: string
	public readonly subscriptionEndpoint: string
	public readonly hostname: string
	public readonly publisherDid: string
	public readonly publisherHandle: string
	public readonly publisherAppPassword: string
	public readonly serviceDid: string
	public readonly subscriptionReconnectDelay: number
	public readonly bskyPlcUrl: string
	public readonly bskyServiceUrl: string
	public readonly useFirehose: boolean
	public readonly useRegexp: boolean
	public readonly searchToDbLoop: number
	public readonly enableWellKnown: boolean
	public readonly enableKyselyLog: boolean
	public readonly authDebugMode: boolean
	public readonly debugMode: boolean
	
	// プライベートコンストラクタ
	private constructor() {
		dotenv.config()
		this.port = this.maybeInt(process.env.FEEDGEN_PORT) ?? 3000
		this.listenHost = this.maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost'
		this.sqliteLocation = this.maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:'
		this.subscriptionEndpoint = this.maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ?? 'wss://bsky.social'
		this.hostname = this.maybeStr(process.env.FEEDGEN_HOSTNAME) ?? ''
		this.publisherDid = this.maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice'
		this.publisherHandle = this.maybeStr(process.env.FEEDGEN_PUBLISHER_HANDLE) ?? ''
		this.publisherAppPassword = this.maybeStr(process.env.FEEDGEN_PUBLISHER_APP_PASSWORD) ?? ''
		this.serviceDid = this.maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${this.hostname}`
		this.subscriptionReconnectDelay = this.maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000
		this.bskyPlcUrl = this.maybeStr(process.env.FEEDGEN_BSKY_PLC_URL) ?? 'https://plc.directory'
		this.bskyServiceUrl = this.maybeStr(process.env.FEEDGEN_BSKY_SERVICE_URL) ?? 'https://bsky.social'
		this.useFirehose = this.maybeBool(process.env.FEEDGEN_USE_FIREHOSE) ?? true
		this.useRegexp = this.maybeBool(process.env.FEEDGEN_USE_REGEXP) ?? true
		this.searchToDbLoop = this.maybeInt(process.env.FEEDGEN_SEARCH_TO_DB_LOOP) ?? 3000
		this.enableWellKnown = this.maybeBool(process.env.FEEDGEN_ENABLE_WELL_KNOWN) ?? true
		this.enableKyselyLog = this.maybeBool(process.env.FEEDGEN_ENABLE_KYSELY_LOG) ?? false
		this.debugMode = this.maybeBool(process.env.FEEDGEN_DEBUG_MODE) ?? false
		this.authDebugMode = this.maybeBool(process.env.FEEDGEN_AUTH_DEBUG_MODE) ?? false
	}
	
	// インスタンスの取得
	public static getInstance(): EnvValue {
		// _inctanceが存在しない場合に、new EnvValue()を実行する。
		if (!this._instance) {
			this._instance = new EnvValue();
		}

		// 生成済みのインスタンスを返す
		return this._instance;
	}

	private maybeStr = (val?: string) => val

	private maybeInt = (val?: string) => {
		if (!val) return undefined
		const int = parseInt(val, 10)
		if (isNaN(int)) return undefined
		return int
	}

	private maybeBool = (val?: string) => {
		if (!val) return undefined
		return val === 'true'
	}
  
}
