import { NextResponse } from 'next/server'
import { deleteRecord, updateRecord } from '@/app/actions/records'

type EditableTable = 'daily_logs' | 'fuel_logs' | 'lpg_logs' | 'maintenance_logs' | 'trips'

const tables = new Set(['daily_logs', 'fuel_logs', 'lpg_logs', 'maintenance_logs', 'trips'])

function parsePayload(payload: unknown) {
  const body = payload as { table?: string; id?: string; values?: Record<string, unknown> } | null

  if (!body?.table || !tables.has(body.table) || !body.id) {
    throw new Error('Invalid record request.')
  }

  return { table: body.table as EditableTable, id: body.id, values: body.values ?? {} }
}

export async function PATCH(request: Request) {
  try {
    const parsed = parsePayload(await request.json().catch(() => null))
    const record = await updateRecord(parsed.table, parsed.id, parsed.values)
    return NextResponse.json({ success: true, record })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'No se pudo actualizar.' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const parsed = parsePayload(await request.json().catch(() => null))
    await deleteRecord(parsed.table, parsed.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'No se pudo borrar.' },
      { status: 400 }
    )
  }
}
