import { NextResponse } from 'next/server'
import { listAuditLogs } from '@/app/actions/audit'

export async function GET() {
  const logs = await listAuditLogs(50)
  return NextResponse.json(logs)
}
