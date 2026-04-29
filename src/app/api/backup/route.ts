import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { DATA_TABLES, quoteIdentifier } from '@/lib/data-tables'
import { writeAuditLog } from '@/app/actions/audit'

function csvValue(value: unknown) {
  const raw = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
  return `"${raw.replaceAll('"', '""')}"`
}

function tablesToCsv(tables: Record<string, unknown[]>) {
  const chunks: string[] = []

  for (const [table, rows] of Object.entries(tables)) {
    chunks.push(`# ${table}`)
    const objects = rows as Record<string, unknown>[]
    const columns = [...new Set(objects.flatMap((row) => Object.keys(row)))]
    chunks.push(columns.join(','))
    for (const row of objects) {
      chunks.push(columns.map((column) => csvValue(row[column])).join(','))
    }
    chunks.push('')
  }

  return chunks.join('\n')
}

export async function GET(request: Request) {
  const tables: Record<string, unknown[]> = {}

  for (const table of DATA_TABLES) {
    const res = await query(`SELECT * FROM public.${quoteIdentifier(table)} ORDER BY created_at ASC`)
    tables[table] = res.rows
  }

  await writeAuditLog({
    action: 'data.exported',
    entity: 'backup',
    metadata: { tables: DATA_TABLES },
  })

  const exportedAt = new Date().toISOString()
  const format = new URL(request.url).searchParams.get('format')

  if (format === 'csv') {
    return new NextResponse(tablesToCsv(tables), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="motorhome-backup-${exportedAt.slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json(
    {
      app: 'motorhome',
      version: 1,
      exported_at: exportedAt,
      tables,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="motorhome-backup-${exportedAt.slice(0, 10)}.json"`,
      },
    }
  )
}
