'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'
import { getActiveTrip } from '@/app/actions/trips'

export type LpgUnit = 'liters' | 'kg'
export type LpgUsageType = 'cooking' | 'heating' | 'mixed' | 'other'

export interface LpgRecord {
  id: string
  trip_id: string | null
  date: string
  amount: number
  quantity: number
  unit: LpgUnit
  price_per_unit: number | null
  place_name: string | null
  usage_type: LpgUsageType
  notes: string | null
  created_at: string
}

export async function createLpgRecord(data: {
  date: string
  amount: number
  quantity: number
  unit: LpgUnit
  price_per_unit?: number | null
  place_name?: string | null
  usage_type?: LpgUsageType
  notes?: string | null
  trip_id?: string | null
}) {
  const activeTrip = data.trip_id === undefined ? await getActiveTrip() : null
  const tripId = data.trip_id ?? activeTrip?.id ?? null
  const pricePerUnit = data.price_per_unit ?? (data.quantity > 0 ? data.amount / data.quantity : null)

  const res = await query<LpgRecord>(
    `
      INSERT INTO lpg_logs (trip_id, date, amount, quantity, unit, price_per_unit, place_name, usage_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      tripId,
      data.date,
      data.amount,
      data.quantity,
      data.unit,
      pricePerUnit,
      data.place_name ?? null,
      data.usage_type ?? 'mixed',
      data.notes ?? null,
    ]
  )

  revalidatePath('/')
  revalidatePath('/lpg')
  revalidatePath('/stats')
  await writeAuditLog({
    action: 'lpg_log.created',
    entity: 'lpg_logs',
    entity_id: res.rows[0]?.id,
    metadata: { amount: data.amount, quantity: data.quantity, unit: data.unit, trip_id: tripId },
  })
  return normalizeLpgRecord(res.rows[0])
}

export async function getLpgRecords() {
  const res = await query<LpgRecord>(`SELECT * FROM lpg_logs ORDER BY date DESC, created_at DESC`)
  return res.rows.map(normalizeLpgRecord)
}

export async function getTotalLpgCost() {
  const res = await query<{ total: string | null }>(`SELECT SUM(amount)::text as total FROM lpg_logs`)
  return res.rows[0]?.total ? parseFloat(res.rows[0].total) : 0
}

function normalizeLpgRecord(row: LpgRecord): LpgRecord {
  return {
    ...row,
    amount: Number(row.amount),
    quantity: Number(row.quantity),
    price_per_unit: row.price_per_unit !== null ? Number(row.price_per_unit) : null,
  }
}
