'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'

export interface OdometerRecord {
  id: string
  date: string
  kilometers: number
  notes: string | null
  created_at: string
}

export async function createOdometerRecord(data: {
  date: string
  kilometers: number
  notes?: string | null
}) {
  const res = await query<OdometerRecord>(
    `
      INSERT INTO odometer_logs (date, kilometers, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [data.date, data.kilometers, data.notes ?? null]
  )
  revalidatePath('/')
  revalidatePath('/odometer')
  await writeAuditLog({
    action: 'odometer_log.created',
    entity: 'odometer_logs',
    entity_id: res.rows[0]?.id,
    metadata: { kilometers: data.kilometers },
  })
  return res.rows[0]
}

export async function getOdometerRecords() {
  const res = await query<OdometerRecord>(
    `SELECT * FROM odometer_logs ORDER BY date DESC, created_at DESC`
  )
  return res.rows
}

export async function getTotalKilometers() {
  const res = await query<{ max: number | null }>(
    `SELECT MAX(kilometers) as max FROM odometer_logs`
  )
  return res.rows[0]?.max ?? 0
}

export async function getCurrentOdometer() {
  const res = await query<{ latest: number | null }>(
    `SELECT kilometers as latest FROM odometer_logs ORDER BY date DESC, created_at DESC LIMIT 1`
  )
  return res.rows[0]?.latest ?? 0
}
