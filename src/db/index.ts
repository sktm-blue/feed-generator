import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'
import { Util } from '../util'
import { EnvValue } from '../envvalue'

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
	})
}

export const migrateToLatest = async (db: Database) => {
	const migrator = new Migrator({ db, provider: migrationProvider })
	const { error } = await migrator.migrateToLatest()
	if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
