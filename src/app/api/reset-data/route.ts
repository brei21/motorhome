import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { CLEAR_TABLE_ORDER, quoteIdentifier } from '@/lib/data-tables'
import { writeAuditLog } from '@/app/actions/audit'
import { normalizePin, verifyConfiguredPin } from '@/lib/auth/pin'

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { confirm?: string; pin?: string } | null

  if (payload?.confirm !== 'RESET') {
    return NextResponse.json(
      { success: false, error: 'Confirmacion requerida.' },
      { status: 400 }
    )
  }

  if (!(await verifyConfiguredPin(normalizePin(payload?.pin)))) {
    return NextResponse.json(
      { success: false, error: 'PIN requerido para borrar datos.' },
      { status: 401 }
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    for (const table of CLEAR_TABLE_ORDER) {
      await client.query(`DELETE FROM public.${quoteIdentifier(table)}`)
    }
    await client.query('COMMIT')
    await writeAuditLog({ action: 'data.reset', entity: 'database' })
    return NextResponse.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Reset failed:', error)
    return NextResponse.json(
      { success: false, error: 'No se pudieron borrar los datos.' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
