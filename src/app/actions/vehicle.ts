'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'

export interface VehicleProfile {
  id: number
  nickname: string | null
  plate: string | null
  model: string | null
  year: number | null
  tire_pressure: string | null
  tire_size: string | null
  oil_type: string | null
  battery_notes: string | null
  gas_notes: string | null
  dimensions: string | null
  insurance_due_date: string | null
  inspection_due_date: string | null
  notes: string | null
}

export interface VehicleDocument {
  id: string
  title: string
  type: string
  document_url: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
}

export async function getVehicleProfile() {
  try {
    const res = await query<VehicleProfile>(`SELECT * FROM vehicle_profile WHERE id = 1 LIMIT 1`)
    return res.rows[0] ?? null
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') throw error
    return null
  }
}

export async function saveVehicleProfile(data: Partial<Omit<VehicleProfile, 'id'>>) {
  const res = await query<VehicleProfile>(
    `
      INSERT INTO vehicle_profile (
        id, nickname, plate, model, year, tire_pressure, tire_size, oil_type,
        battery_notes, gas_notes, dimensions, insurance_due_date, inspection_due_date, notes
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        nickname = EXCLUDED.nickname,
        plate = EXCLUDED.plate,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        tire_pressure = EXCLUDED.tire_pressure,
        tire_size = EXCLUDED.tire_size,
        oil_type = EXCLUDED.oil_type,
        battery_notes = EXCLUDED.battery_notes,
        gas_notes = EXCLUDED.gas_notes,
        dimensions = EXCLUDED.dimensions,
        insurance_due_date = EXCLUDED.insurance_due_date,
        inspection_due_date = EXCLUDED.inspection_due_date,
        notes = EXCLUDED.notes
      RETURNING *
    `,
    [
      data.nickname ?? null,
      data.plate ?? null,
      data.model ?? null,
      data.year ?? null,
      data.tire_pressure ?? null,
      data.tire_size ?? null,
      data.oil_type ?? null,
      data.battery_notes ?? null,
      data.gas_notes ?? null,
      data.dimensions ?? null,
      data.insurance_due_date ?? null,
      data.inspection_due_date ?? null,
      data.notes ?? null,
    ]
  )
  revalidatePath('/settings')
  revalidatePath('/')
  await writeAuditLog({ action: 'vehicle_profile.saved', entity: 'vehicle_profile', entity_id: '1' })
  return res.rows[0]
}

export async function getVehicleDocuments() {
  try {
    const res = await query<VehicleDocument>(`SELECT * FROM vehicle_documents ORDER BY expires_at ASC NULLS LAST, created_at DESC`)
    return res.rows
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') throw error
    return []
  }
}

export async function createVehicleDocument(data: Omit<VehicleDocument, 'id' | 'created_at'>) {
  const res = await query<VehicleDocument>(
    `
      INSERT INTO vehicle_documents (title, type, document_url, expires_at, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [data.title, data.type, data.document_url ?? null, data.expires_at ?? null, data.notes ?? null]
  )
  revalidatePath('/settings')
  await writeAuditLog({ action: 'vehicle_document.created', entity: 'vehicle_documents', entity_id: res.rows[0]?.id })
  return res.rows[0]
}
