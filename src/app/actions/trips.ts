'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import type { DailyRecord, DailyRecordStatus, DailyStop } from '@/app/actions/daily-records'
import type { LpgRecord } from '@/app/actions/lpg-records'
import { writeAuditLog } from '@/app/actions/audit'

export interface TripDailyRecord {
  id: string
  trip_id: string | null
  date: string
  status: DailyRecordStatus
  latitude: number | null
  longitude: number | null
  location_name: string | null
  notes: string | null
  accommodation_cost: number | null
  daily_expenses: number | null
  daily_expenses_notes: string | null
  visited_places: string[]
  stops: DailyStop[]
  grey_water_emptied: boolean
  black_water_emptied: boolean
  fresh_water_filled: boolean
  created_at: string
}

export interface TripFuelRecord {
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

export interface TripMaintenanceRecord {
  id: string
  trip_id: string | null
  date: string
  type: string
  description: string
  cost: number | null
  odometer_at: number | null
  due_odometer: number | null
  due_date: string | null
  created_at: string
}

export type TripLpgRecord = LpgRecord

export interface Trip {
  id: string
  started_at: string
  ended_at: string | null
  start_odometer: number
  end_odometer: number | null
  start_location: string | null
  end_location: string | null
  notes: string | null
  start_checklist: Record<string, boolean> | null
  end_checklist: Record<string, boolean> | null
  created_at: string
  daily_logs?: TripDailyRecord[]
  fuel_logs?: TripFuelRecord[]
  lpg_logs?: TripLpgRecord[]
  maintenance_logs?: TripMaintenanceRecord[]
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value
}

function normalizeTrip(row: Trip) {
  return {
    ...row,
    started_at: toIsoString(row.started_at),
    ended_at: row.ended_at ? toIsoString(row.ended_at) : null,
    created_at: toIsoString(row.created_at),
    start_odometer: Number(row.start_odometer),
    end_odometer: row.end_odometer !== null ? Number(row.end_odometer) : null,
  }
}

export async function startTrip(data: {
  start_odometer: number
  start_location?: string | null
  notes?: string | null
  start_checklist?: Record<string, boolean>
}) {
  const res = await query<Trip>(
    `
      INSERT INTO trips (started_at, start_odometer, start_location, notes, start_checklist)
      VALUES (NOW(), $1, $2, $3, $4::jsonb)
      RETURNING *
    `,
    [
      data.start_odometer,
      data.start_location ?? null,
      data.notes ?? null,
      JSON.stringify(data.start_checklist ?? {}),
    ]
  )
  revalidatePath('/')
  revalidatePath('/odometer')
  await writeAuditLog({
    action: 'trip.started',
    entity: 'trips',
    entity_id: res.rows[0]?.id,
    metadata: { start_odometer: data.start_odometer },
  })
  return res.rows[0]
}

export async function endTrip(data: {
  trip_id: string
  end_odometer: number
  end_location?: string | null
  notes?: string | null
  end_checklist?: Record<string, boolean>
}) {
  const res = await query<Trip>(
    `
      UPDATE trips
      SET ended_at = NOW(),
          end_odometer = $2,
          end_location = $3,
          notes = COALESCE($4, notes),
          end_checklist = $5::jsonb
      WHERE id = $1
      RETURNING *
    `,
    [
      data.trip_id,
      data.end_odometer,
      data.end_location ?? null,
      data.notes ?? null,
      JSON.stringify(data.end_checklist ?? {}),
    ]
  )
  revalidatePath('/')
  revalidatePath('/odometer')
  await writeAuditLog({
    action: 'trip.ended',
    entity: 'trips',
    entity_id: data.trip_id,
    metadata: { end_odometer: data.end_odometer },
  })
  return res.rows[0]
}

export async function listTrips(limit = 20) {
  const res = await query<Trip>(
    `SELECT * FROM trips ORDER BY started_at DESC LIMIT $1`,
    [limit]
  )
  const trips = res.rows.map(normalizeTrip)

  if (trips.length === 0) {
    return trips
  }

  const dailyRes = await query<DailyRecord>(
    `
      SELECT *
      FROM daily_logs
      WHERE trip_id = ANY($1::uuid[])
      ORDER BY date ASC, created_at ASC
    `,
    [trips.map((trip) => trip.id)]
  )

  const logsByTrip = dailyRes.rows.reduce<Record<string, TripDailyRecord[]>>((acc, row) => {
    if (!row.trip_id) return acc

    acc[row.trip_id] = acc[row.trip_id] ?? []
    acc[row.trip_id].push({
      ...row,
      accommodation_cost: row.accommodation_cost !== null ? Number(row.accommodation_cost) : null,
      daily_expenses: row.daily_expenses !== null ? Number(row.daily_expenses) : null,
      visited_places: row.visited_places ?? [],
      stops: row.stops ?? [],
    })
    return acc
  }, {})

  return trips.map((trip) => ({
    ...trip,
    daily_logs: logsByTrip[trip.id] ?? [],
  }))
}

export async function getTripDetail(id: string) {
  const tripRes = await query<Trip>(`SELECT * FROM trips WHERE id = $1 LIMIT 1`, [id])
  const trip = tripRes.rows[0]

  if (!trip) return null

  const [dailyRes, fuelRes, lpgRes, maintenanceRes] = await Promise.all([
    query<DailyRecord>(
      `SELECT * FROM daily_logs WHERE trip_id = $1 ORDER BY date ASC, created_at ASC`,
      [id]
    ),
    query<TripFuelRecord>(
      `SELECT * FROM fuel_logs WHERE trip_id = $1 ORDER BY date ASC, created_at ASC`,
      [id]
    ).catch((error) => {
      if ((error as { code?: string }).code !== '42703') throw error
      return { rows: [] as TripFuelRecord[] }
    }),
    query<TripLpgRecord>(
      `SELECT * FROM lpg_logs WHERE trip_id = $1 ORDER BY date ASC, created_at ASC`,
      [id]
    ).catch((error) => {
      if ((error as { code?: string }).code !== '42P01' && (error as { code?: string }).code !== '42703') throw error
      return { rows: [] as TripLpgRecord[] }
    }),
    query<TripMaintenanceRecord>(
      `SELECT * FROM maintenance_logs WHERE trip_id = $1 ORDER BY date ASC, created_at ASC`,
      [id]
    ).catch((error) => {
      if ((error as { code?: string }).code !== '42703') throw error
      return { rows: [] as TripMaintenanceRecord[] }
    }),
  ])

  return {
    ...normalizeTrip(trip),
    daily_logs: dailyRes.rows.map((row) => ({
      ...row,
      date: toIsoString(row.date),
      created_at: toIsoString(row.created_at),
      accommodation_cost: row.accommodation_cost !== null ? Number(row.accommodation_cost) : null,
      daily_expenses: row.daily_expenses !== null ? Number(row.daily_expenses) : null,
      visited_places: row.visited_places ?? [],
      stops: row.stops ?? [],
    })),
    fuel_logs: fuelRes.rows.map((row) => ({
      ...row,
      date: toIsoString(row.date),
      created_at: toIsoString(row.created_at),
      amount: Number(row.amount),
      price_per_liter: Number(row.price_per_liter),
      odometer_at: row.odometer_at !== null ? Number(row.odometer_at) : null,
    })),
    lpg_logs: lpgRes.rows.map((row) => ({
      ...row,
      date: toIsoString(row.date),
      created_at: toIsoString(row.created_at),
      amount: Number(row.amount),
      quantity: Number(row.quantity),
      price_per_unit: row.price_per_unit !== null ? Number(row.price_per_unit) : null,
    })),
    maintenance_logs: maintenanceRes.rows.map((row) => ({
      ...row,
      date: toIsoString(row.date),
      due_date: row.due_date ? toIsoString(row.due_date) : null,
      created_at: toIsoString(row.created_at),
      cost: row.cost !== null ? Number(row.cost) : null,
      odometer_at: row.odometer_at !== null ? Number(row.odometer_at) : null,
      due_odometer: row.due_odometer !== null ? Number(row.due_odometer) : null,
    })),
  }
}

export async function getActiveTrip() {
  const res = await query<Trip>(
    `SELECT * FROM trips WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1`
  )
  const row = res.rows[0]
  return row
    ? normalizeTrip(row)
    : null
}
