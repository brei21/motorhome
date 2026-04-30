import process from 'node:process'
import pg from 'pg'

const { Client } = pg

const tables = [
  'daily_logs',
  'odometer_logs',
  'maintenance_logs',
  'fuel_logs',
  'lpg_logs',
  'maintenance_reminders',
  'trips',
  'favorite_places',
  'vehicle_profile',
  'vehicle_documents',
  'action_audit_logs',
  'auth_settings',
  'auth_login_attempts',
]

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to reset the database.')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const existingTables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [tables]
    )

    const names = existingTables.rows.map((row) => row.tablename)

    if (names.length === 0) {
      console.log('No tables found to clear.')
      return
    }

    await client.query(`TRUNCATE TABLE ${names.join(', ')} RESTART IDENTITY CASCADE`)
    console.log('Database cleared successfully.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
