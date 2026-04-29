import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { CLEAR_TABLE_ORDER, DATA_TABLES, RESTORE_TABLE_ORDER, quoteIdentifier } from '@/lib/data-tables'
import { writeAuditLog } from '@/app/actions/audit'
import { normalizePin, verifyConfiguredPin } from '@/lib/auth/pin'

type BackupPayload = {
  app?: string
  version?: number
  pin?: string
  tables?: Record<string, Record<string, unknown>[]>
}

function isBackupPayload(payload: unknown): payload is BackupPayload {
  if (!payload || typeof payload !== 'object') return false
  const maybe = payload as BackupPayload
  if (maybe.app !== 'motorhome' || typeof maybe.tables !== 'object' || !maybe.tables) return false
  return DATA_TABLES.every((table) => Array.isArray(maybe.tables?.[table]))
}

function normalizeValue(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return value
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown

  if (!isBackupPayload(payload)) {
    return NextResponse.json(
      { success: false, error: 'Archivo de backup no valido.' },
      { status: 400 }
    )
  }

  if (!(await verifyConfiguredPin(normalizePin(payload.pin)))) {
    return NextResponse.json(
      { success: false, error: 'PIN requerido para restaurar backup.' },
      { status: 401 }
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('SET CONSTRAINTS ALL DEFERRED')

    for (const table of CLEAR_TABLE_ORDER) {
      await client.query(`DELETE FROM public.${quoteIdentifier(table)}`)
    }

    for (const table of RESTORE_TABLE_ORDER) {
      const rows = payload.tables?.[table] ?? []

      for (const row of rows) {
        const entries = Object.entries(row)
        if (entries.length === 0) continue

        const columns = entries.map(([column]) => quoteIdentifier(column)).join(', ')
        const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ')
        const values = entries.map(([, value]) => normalizeValue(value))

        await client.query(
          `INSERT INTO public.${quoteIdentifier(table)} (${columns}) VALUES (${placeholders})`,
          values
        )
      }
    }

    await client.query('COMMIT')
    await writeAuditLog({
      action: 'data.restored',
      entity: 'backup',
      metadata: { version: payload.version ?? null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Restore failed:', error)
    return NextResponse.json(
      { success: false, error: 'No se pudo restaurar el backup.' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
