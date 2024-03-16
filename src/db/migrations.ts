import { Kysely, Migration, MigrationProvider } from 'kysely'

const migrations: Record<string, Migration> = {}

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations
  },
}

migrations['001'] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable('post')
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('uri', 'varchar', (col) => col.notNull())
      .addColumn('cid', 'varchar', (col) => col.notNull())
      .addColumn('text', 'text', (col) => col.notNull())    // text
      .addColumn('lang1', 'integer')    // lang1
      .addColumn('lang2', 'integer')    // lang2
      .addColumn('lang3', 'integer')    // lang3
      .addColumn('postType', 'integer')
      .addColumn('indexedAt', 'varchar', (col) => col.notNull())
      .addColumn('imageCount', 'integer')    // imageCount
      .execute()
    await db.schema
      .createTable('tag')
      .addColumn('id', 'integer')
      .addColumn('tagStr', 'varchar', (col) => col.notNull())
      .execute()
    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'varchar', (col) => col.primaryKey())
      .addColumn('cursor', 'integer', (col) => col.notNull())
      .execute()

    await db.schema
      .createIndex('post_index')
      .on('post')
      .columns(['uri', 'lang1'])
      .execute()
    await db.schema
      .createIndex('tag_index')
      .on('tag')
      .columns(['tagStr'])
      .execute()
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable('post').execute()
    await db.schema.dropTable('tag').execute()
    await db.schema.dropTable('sub_state').execute()
  },
}
