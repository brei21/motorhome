'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'
import { getActiveTrip } from '@/app/actions/trips'

export type MaintenanceType = 'repair' | 'improvement' | 'maintenance'

export interface MaintenanceRecord {
  id: string
  trip_id: string | null
  date: string
  type: MaintenanceType
  description: string
  cost: number | null
  odometer_at: number | null
  due_odometer: number | null
  due_date: string | null
  attachment_urls: string[]
  created_at: string
}

export async function createMaintenanceRecord(data: {
  date: string
  type: MaintenanceType
  description: string
  cost?: number | null
  odometer_at?: number | null
  due_odometer?: number | null
  due_date?: string | null
  attachment_urls?: string[]
  trip_id?: string | null
}) {
  const activeTrip = data.trip_id === undefined ? await getActiveTrip() : null
  const tripId = data.trip_id ?? activeTrip?.id ?? null
  let res
  try {
    res = await query<MaintenanceRecord>(
      `
        INSERT INTO maintenance_logs (trip_id, date, type, description, cost, odometer_at, due_odometer, due_date, attachment_urls)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        tripId,
        data.date,
        data.type,
        data.description,
        data.cost ?? null,
        data.odometer_at ?? null,
        data.due_odometer ?? null,
        data.due_date ?? null,
        data.attachment_urls ?? [],
      ]
    )
  } catch (error) {
    if ((error as { code?: string }).code !== '42703') throw error
    res = await query<MaintenanceRecord>(
      `
        INSERT INTO maintenance_logs (date, type, description, cost, odometer_at, due_odometer, due_date, attachment_urls)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        data.date,
        data.type,
        data.description,
        data.cost ?? null,
        data.odometer_at ?? null,
        data.due_odometer ?? null,
        data.due_date ?? null,
        data.attachment_urls ?? [],
      ]
    )
  }
  revalidatePath('/')
  revalidatePath('/maintenance')
  await writeAuditLog({
    action: 'maintenance_log.created',
    entity: 'maintenance_logs',
    entity_id: res.rows[0]?.id,
    metadata: { type: data.type, odometer_at: data.odometer_at ?? null, trip_id: tripId },
  })
  return res.rows[0]
}

export async function getMaintenanceRecords() {
  const res = await query<MaintenanceRecord>(
    `SELECT * FROM maintenance_logs ORDER BY date DESC, created_at DESC`
  )
  return res.rows.map((r: MaintenanceRecord) => ({
    ...r,
    cost: r.cost !== null ? Number(r.cost) : null,
    odometer_at: r.odometer_at !== null
      ? Number(r.odometer_at)
      : null,
    due_odometer: r.due_odometer !== null ? Number(r.due_odometer) : null,
    attachment_urls: r.attachment_urls ?? [],
  }))
}

export async function getTotalMaintenanceCost() {
  const res = await query<{ total: string | null }>(
    `SELECT SUM(cost)::text as total FROM maintenance_logs`
  )
  return res.rows[0]?.total ? parseFloat(res.rows[0].total) : 0
}
