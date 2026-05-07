'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'

type EditableTable = 'daily_logs' | 'fuel_logs' | 'lpg_logs' | 'maintenance_logs' | 'trips'

const editableColumns: Record<EditableTable, Set<string>> = {
  daily_logs: new Set([
    'date',
    'status',
    'location_name',
    'notes',
    'accommodation_cost',
    'daily_expenses',
    'daily_expenses_notes',
    'daily_expense_breakdown',
    'visited_places',
    'stops',
    'grey_water_emptied',
    'black_water_emptied',
    'fresh_water_filled',
    'tags',
    'photo_urls',
  ]),
  fuel_logs: new Set(['date', 'amount', 'price_per_liter', 'odometer_at', 'station_name', 'full_tank', 'trip_id']),
  lpg_logs: new Set(['date', 'amount', 'quantity', 'unit', 'price_per_unit', 'place_name', 'usage_type', 'notes', 'trip_id']),
  maintenance_logs: new Set(['date', 'type', 'description', 'cost', 'odometer_at', 'due_odometer', 'due_date', 'trip_id']),
  trips: new Set(['start_location', 'end_location', 'notes', 'start_odometer', 'end_odometer']),
}

const jsonbColumns: Partial<Record<EditableTable, Set<string>>> = {
  daily_logs: new Set(['daily_expense_breakdown', 'stops']),
}

function quote(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function isJsonbColumn(table: EditableTable, key: string) {
  return Boolean(jsonbColumns[table]?.has(key))
}

function serializeValue(table: EditableTable, key: string, value: unknown) {
  if (value === '') return null
  if (isJsonbColumn(table, key)) return JSON.stringify(value ?? {})
  return value
}

function revalidateCommon() {
  revalidatePath('/')
  revalidatePath('/daily')
  revalidatePath('/fuel')
  revalidatePath('/lpg')
  revalidatePath('/maintenance')
  revalidatePath('/odometer')
  revalidatePath('/stats')
}

export async function updateRecord(table: EditableTable, id: string, values: Record<string, unknown>) {
  const allowed = editableColumns[table]
  const entries = Object.entries(values).filter(([key]) => allowed.has(key))

  if (entries.length === 0) {
    throw new Error('No editable fields supplied.')
  }

  const assignments = entries
    .map(([key], index) => `${quote(key)} = $${index + 2}${isJsonbColumn(table, key) ? '::jsonb' : ''}`)
    .join(', ')
  const params = [id, ...entries.map(([key, value]) => serializeValue(table, key, value))]
  const res = await query(
    `UPDATE ${quote(table)} SET ${assignments} WHERE id = $1 RETURNING id`,
    params
  )

  revalidateCommon()
  await writeAuditLog({
    action: `${table}.updated`,
    entity: table,
    entity_id: id,
    metadata: { fields: entries.map(([key]) => key) },
  })
  return res.rows[0]
}

export async function deleteRecord(table: EditableTable, id: string) {
  await query(`DELETE FROM ${quote(table)} WHERE id = $1`, [id])
  revalidateCommon()
  await writeAuditLog({
    action: `${table}.deleted`,
    entity: table,
    entity_id: id,
  })
  return { success: true }
}
