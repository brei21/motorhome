import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const { Client } = pg

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations.')
  }

  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
  const sql = await readFile(schemaPath, 'utf8')

  const client = new Client({ connectionString })

  await client.connect()

  try {
    await client.query(sql)
    console.log('Schema applied successfully.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
