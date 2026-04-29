import { NextResponse } from 'next/server'
import { createVehicleDocument, getVehicleDocuments, getVehicleProfile, saveVehicleProfile } from '@/app/actions/vehicle'

export async function GET() {
  const [profile, documents] = await Promise.all([
    getVehicleProfile(),
    getVehicleDocuments(),
  ])

  return NextResponse.json({ profile, documents })
}

export async function POST(request: Request) {
  const payload = await request.json()

  if (payload?.kind === 'document') {
    const title = String(payload.title || '').trim()
    if (!title) {
      return NextResponse.json({ success: false, error: 'Titulo requerido.' }, { status: 400 })
    }
    const document = await createVehicleDocument({
      title,
      type: payload.type || 'other',
      document_url: payload.document_url || null,
      expires_at: payload.expires_at || null,
      notes: payload.notes || null,
    })
    return NextResponse.json({ success: true, document })
  }

  const profile = await saveVehicleProfile({
    nickname: payload.nickname || null,
    plate: payload.plate || null,
    model: payload.model || null,
    year: payload.year ? Number(payload.year) : null,
    tire_pressure: payload.tire_pressure || null,
    tire_size: payload.tire_size || null,
    oil_type: payload.oil_type || null,
    battery_notes: payload.battery_notes || null,
    gas_notes: payload.gas_notes || null,
    dimensions: payload.dimensions || null,
    insurance_due_date: payload.insurance_due_date || null,
    inspection_due_date: payload.inspection_due_date || null,
    notes: payload.notes || null,
  })
  return NextResponse.json({ success: true, profile })
}
