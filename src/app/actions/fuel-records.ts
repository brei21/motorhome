'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'
import { getActiveTrip } from '@/app/actions/trips'

export interface FuelRecord {
  id: string
  trip_id: string | null
  date: string
  amount: number
  price_per_liter: number
  odometer_at: number | null
  station_name: string | null
  full_tank: boolean
  created_at: string
}

export async function createFuelRecord(data: {
  date: string
  amount: number
  price_per_liter: number
  odometer_at?: number | null
  station_name?: string | null
  full_tank?: boolean
  trip_id?: string | null
}) {
  const activeTrip = data.trip_id === undefined ? await getActiveTrip() : null
  const tripId = data.trip_id ?? activeTrip?.id ?? null
  let res
  try {
    res = await query<FuelRecord>(
      `
        INSERT INTO fuel_logs (trip_id, date, amount, price_per_liter, odometer_at, station_name, full_tank)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        tripId,
        data.date,
        data.amount,
        data.price_per_liter,
        data.odometer_at ?? null,
        data.station_name ?? null,
        data.full_tank ?? true,
      ]
    )
  } catch (error) {
    if ((error as { code?: string }).code !== '42703') throw error
    res = await query<FuelRecord>(
      `
        INSERT INTO fuel_logs (date, amount, price_per_liter, odometer_at, station_name, full_tank)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        data.date,
        data.amount,
        data.price_per_liter,
        data.odometer_at ?? null,
        data.station_name ?? null,
        data.full_tank ?? true,
      ]
    )
  }
  revalidatePath('/')
  revalidatePath('/fuel')
  await writeAuditLog({
    action: 'fuel_log.created',
    entity: 'fuel_logs',
    entity_id: res.rows[0]?.id,
    metadata: { amount: data.amount, trip_id: tripId },
  })
  return res.rows[0]
}

export async function getFuelRecords() {
  const res = await query<FuelRecord>(
    `SELECT * FROM fuel_logs ORDER BY date DESC, created_at DESC`
  )
  return res.rows.map((r: FuelRecord) => ({
    ...r,
    amount: Number(r.amount),
    price_per_liter: Number(r.price_per_liter),
    odometer_at: r.odometer_at !== null ? Number(r.odometer_at) : null,
  }))
}

export async function getTotalFuelCost() {
  const res = await query<{ total: string | null }>(
    `SELECT SUM(amount)::text as total FROM fuel_logs`
  )
  return res.rows[0]?.total ? parseFloat(res.rows[0].total) : 0
}
