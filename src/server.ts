import http from 'http'
import events from 'events'
import express from 'express'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { createServer } from './lexicon'
import feedGeneration from './methods/feed-generation'
import describeGenerator from './methods/describe-generator'
import { createDb, Database, migrateToLatest } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext, Config } from './config'
import wellKnown from './well-known'
import { AtpAgent } from '@atproto/api'

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config
  public agent: AtpAgent

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    agent: AtpAgent,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.agent = agent
    this.cfg = cfg
  }

  static create(cfg: Config) {
    const app = express()
    const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)
    const agent = new AtpAgent({ service: cfg.bskyServiceUrl })

    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
      agent,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)

    // /.well-known/did.jsonの取得要求をfeed-generatorで応答する処理
    // Webサーバーで直接did.jsonファイルを返す場合はコメントアウトする
    app.use(wellKnown(ctx))

    return new FeedGenerator(app, db, firehose, agent, cfg)
  }

  async start(): Promise<http.Server> {
    await migrateToLatest(this.db)
    this.server = this.app.listen(this.cfg.port, this.cfg.listenhost)
    await events.once(this.server, 'listening')
    return this.server
  }

  async runFirehose(): Promise<void> {
    this.firehose.run(this.cfg.subscriptionReconnectDelay)
  }
}

export default FeedGenerator
