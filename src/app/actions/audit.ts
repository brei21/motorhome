'use server'

import { query } from '@/lib/db'

export async function writeAuditLog(data: {
  action: string
  entity?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown>
  source?: string
}) {
  try {
    await query(
      `
        INSERT INTO action_audit_logs (action, entity, entity_id, metadata, source)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        data.action,
        data.entity ?? null,
        data.entity_id ?? null,
        JSON.stringify(data.metadata ?? {}),
        data.source ?? 'web',
      ]
    )
  } catch (error) {
    console.error('Audit log write failed:', error)
  }
}

export interface AuditLog {
  id: string
  action: string
  entity: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  source: string
  created_at: string
}

export async function listAuditLogs(limit = 30) {
  const res = await query<AuditLog>(
    `SELECT * FROM action_audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return res.rows
}
