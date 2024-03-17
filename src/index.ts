import FeedGenerator from './server'
import { EnvValue } from './envvalue'
import { Trace } from './trace'
import * as os from 'os'

const run = async () => {
	const env: EnvValue = EnvValue.getInstance()
	const server = FeedGenerator.create({
		port: env.port,
		listenhost: env.listenHost,
		sqliteLocation: env.sqliteLocation,
		subscriptionEndpoint: env.subscriptionEndpoint,
		bskyServiceUrl: env.bskyServiceUrl,
		publisherDid: env.publisherDid,
		subscriptionReconnectDelay: env.subscriptionReconnectDelay,
		hostname: env.hostname,
		serviceDid: env.serviceDid,
	})

	const numCPUs: number = os.cpus().length	// コア数取得
	if (numCPUs == 1) {
		process.title = 'feedgen-single'
		await server.start()
		if (env.useFirehose) {
			await server.runFirehose()
		}
		console.log(
			`🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
		)
	} else {
		const cluster = require('cluster')
		if (cluster.isMaster) {		// マスターなら
			Trace.info(`master ${process.pid} started, numCPUs = ${numCPUs}`)
			process.title = 'feedgen-master'

			if (env.useFirehose) {
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
}

run()
