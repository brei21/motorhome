import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('DATABASE_URL not set; pg pool will not connect.')
}

export const pool = new Pool({
  connectionString,
})

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  const res = await pool.query<T, unknown[]>(text, params ?? [])
  return res
}

export type DbRow<T> = T extends Promise<infer U> ? U : never
