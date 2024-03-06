import dotenv from 'dotenv'
import FeedGenerator from './server'
import { Trace } from './trace'
import * as cluster from 'cluster'
import * as os from 'os'

const run = async () => {
	dotenv.config()
	const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
	const serviceDid =
		maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
	const server = FeedGenerator.create({
		port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
		listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
		sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
		subscriptionEndpoint:
			maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
			'wss://bsky.network',
		publisherDid:
			maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
		subscriptionReconnectDelay:
			maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
		hostname,
		serviceDid,
	})

	const numCPUs = os.cpus().length	// コア数取得
	const cluster = require('cluster')
	if (cluster.isMaster) {		// マスターなら
		Trace.info(`master ${process.pid} started, numCPUs = ${numCPUs}`)
		process.title = 'feedgen-master'

		if (process.env.FEEDGEN_USE_FIREHOSE === 'true') {
			await server.runFirehose()
		}

		// CPUコア数のワーカーを起動
		for (let i = 0; i < numCPUs - 1; i++) {		// マスター分1引く
			cluster.fork()
		}

		cluster.on('exit', function (worker, code, signal) {
			Trace.info(`worker ${worker.process.pid} died`)
			cluster.fork()
		})
	} else {	// ワーカーなら
		Trace.info(`worker ${process.pid} started`)
		process.title = 'feedgen-worker'

		await server.start()
		Trace.info(
			`🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
		)
	}

}

const maybeStr = (val?: string) => {
	if (!val) return undefined
	return val
}

const maybeInt = (val?: string) => {
	if (!val) return undefined
	const int = parseInt(val, 10)
	if (isNaN(int)) return undefined
	return int
}

run()
