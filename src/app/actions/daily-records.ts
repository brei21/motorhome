'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { getActiveTrip, startTrip } from '@/app/actions/trips'
import { getCurrentOdometer } from '@/app/actions/odometer-records'
import { writeAuditLog } from '@/app/actions/audit'

export type DailyRecordStatus = 'travel' | 'parking' | 'motorhome_area' | 'vacation_home'
export type DailyStopType = 'start' | 'visit' | 'overnight' | 'service' | 'other'

export interface DailyStop {
  type: DailyStopType
  name: string
  notes?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface DailyRecord {
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
  tags: string[]
  photo_urls: string[]
  created_at: string
}

export async function createDailyRecord(data: {
  date: string
  status: DailyRecordStatus
  trip_id?: string | null
  latitude?: number | null
  longitude?: number | null
  location_name?: string | null
  notes?: string | null
  accommodation_cost?: number | null
  daily_expenses?: number | null
  daily_expenses_notes?: string | null
  visited_places?: string[]
  stops?: DailyStop[]
  grey_water_emptied?: boolean
  black_water_emptied?: boolean
  fresh_water_filled?: boolean
  tags?: string[]
  photo_urls?: string[]
}) {
  let tripId = data.trip_id ?? null

  if (data.status === 'travel' && !tripId) {
    const activeTrip = await getActiveTrip()

    if (activeTrip) {
      tripId = activeTrip.id
    } else {
      const currentOdometer = await getCurrentOdometer()
      const createdTrip = await startTrip({
        start_odometer: currentOdometer,
        start_location: data.location_name ?? null,
        notes: data.notes ?? null,
      })
      tripId = createdTrip.id
      await writeAuditLog({
        action: 'trip.auto_started_from_daily',
        entity: 'trips',
        entity_id: tripId,
      })
    }
  }

  const stops = normalizeDailyStops(data.stops ?? [])
  const visitedPlaces = data.visited_places?.length
    ? data.visited_places
    : stops.map((stop) => stop.name).filter(Boolean)

  const res = await query<DailyRecord>(
    `
      INSERT INTO daily_logs (
        trip_id, date, status, latitude, longitude, location_name, notes,
        accommodation_cost, daily_expenses, daily_expenses_notes, visited_places, stops,
        grey_water_emptied, black_water_emptied, fresh_water_filled, tags, photo_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
      RETURNING *
    `,
    [
      tripId,
      data.date,
      data.status,
      data.latitude ?? null,
      data.longitude ?? null,
      data.location_name ?? null,
      data.notes ?? null,
      data.accommodation_cost ?? null,
      data.daily_expenses ?? null,
      data.daily_expenses_notes ?? null,
      visitedPlaces,
      JSON.stringify(stops),
      data.grey_water_emptied ?? false,
      data.black_water_emptied ?? false,
      data.fresh_water_filled ?? false,
      data.tags ?? [],
      data.photo_urls ?? [],
    ]
  )

  revalidatePath('/')
  revalidatePath('/daily')
  revalidatePath('/odometer')
  await writeAuditLog({
    action: 'daily_log.created',
    entity: 'daily_logs',
    entity_id: res.rows[0]?.id,
    metadata: { status: data.status, trip_id: tripId },
  })
  return res.rows[0]
}

export async function getDailyRecords(limit = 20) {
  const res = await query<DailyRecord>(
    `SELECT * FROM daily_logs ORDER BY date DESC, created_at DESC LIMIT $1`,
    [limit]
  )
  return res.rows.map((r: DailyRecord) => ({
    ...r,
    accommodation_cost: r.accommodation_cost !== null ? Number(r.accommodation_cost) : null,
    daily_expenses: r.daily_expenses !== null ? Number(r.daily_expenses) : null,
    visited_places: r.visited_places ?? [],
    stops: normalizeDailyStops(r.stops ?? []),
    tags: r.tags ?? [],
    photo_urls: r.photo_urls ?? [],
  }))
}

function normalizeDailyStops(value: unknown): DailyStop[] {
  if (!Array.isArray(value)) return []

  const stops: DailyStop[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    if (!name) continue

    const type = ['start', 'visit', 'overnight', 'service', 'other'].includes(String(raw.type))
      ? String(raw.type) as DailyStopType
      : 'visit'

    stops.push({
      type,
      name,
      notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null,
      latitude: typeof raw.latitude === 'number' ? raw.latitude : null,
      longitude: typeof raw.longitude === 'number' ? raw.longitude : null,
    })
  }

  return stops
}

export async function getStatsByStatus() {
  const res = await query<{ status: DailyRecordStatus; count: string }>(
    `SELECT status, COUNT(*)::text as count FROM daily_logs GROUP BY status`
  )
  return res.rows.reduce<Record<DailyRecordStatus, number>>(
    (
      acc: Record<DailyRecordStatus, number>,
      row: { status: DailyRecordStatus; count: string }
    ) => ({ ...acc, [row.status]: parseInt(row.count, 10) }),
    { travel: 0, parking: 0, motorhome_area: 0, vacation_home: 0 }
  )
}

export async function getWaterStats() {
  const res = await query<{ grey: number; black: number; fresh: number }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE grey_water_emptied) AS grey,
        COUNT(*) FILTER (WHERE black_water_emptied) AS black,
        COUNT(*) FILTER (WHERE fresh_water_filled) AS fresh
      FROM daily_logs
    `
  )
  const row = res.rows[0] || { grey: 0, black: 0, fresh: 0 }
  return {
    grey_water: Number(row.grey) || 0,
    black_water: Number(row.black) || 0,
    fresh_water: Number(row.fresh) || 0,
  }
}

export async function getLatestLocation() {
  const res = await query<{ latitude: number | null; longitude: number | null }>(
    `SELECT latitude, longitude FROM daily_logs WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY date DESC, created_at DESC LIMIT 1`
  )
  const row = res.rows[0]
  return row ? { lat: row.latitude, lng: row.longitude } : { lat: 41.3851, lng: 2.1734 }
}

export async function getTotalAccommodationCost() {
  const res = await query<{ total: string | null }>(
    `SELECT SUM(COALESCE(accommodation_cost, 0) + COALESCE(daily_expenses, 0))::text as total FROM daily_logs`
  )
  return res.rows[0]?.total ? parseFloat(res.rows[0].total) : 0
}
