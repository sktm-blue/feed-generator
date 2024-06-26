import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'
import { Util } from '../util'
import { EnvValue } from '../envvalue'
import { Trace } from '../trace'

export const createDb = (location: string): Database => {

	let sqdb = new SqliteDb(location)
	if (EnvValue.getInstance().useRegexp) {
		sqdb.loadExtension('./regexp')    // 正規表現ライブラリの読み込み
	}

	return new Kysely<DatabaseSchema>({
		dialect: new SqliteDialect({
			//database: new SqliteDb(location),
			database: sqdb,

		}),
		log: (event) => {
			const env: EnvValue = EnvValue.getInstance()
			if (env.debugMode && env.enableKyselyLog && event.level == 'query') {
				const q = event.query;
				const time = Math.round(event.queryDurationMillis * 100) / 100;
				Trace.debug(`\u001b[34mkysely:sql\u001b[0m [${q.sql}] parameters: [${q.parameters}] time: ${time}`);
			}
		}
	})
}

export const migrateToLatest = async (db: Database) => {
	const migrator = new Migrator({ db, provider: migrationProvider })
	const { error } = await migrator.migrateToLatest()
	if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
