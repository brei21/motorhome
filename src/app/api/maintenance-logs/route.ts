import { NextResponse } from 'next/server'
import { getMaintenanceRecords } from '@/app/actions/maintenance-records'

export async function GET() {
  const logs = await getMaintenanceRecords()
  return NextResponse.json(logs)
}
