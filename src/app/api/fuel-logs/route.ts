import { NextResponse } from 'next/server'
import { getFuelRecords } from '@/app/actions/fuel-records'

export async function GET() {
  const logs = await getFuelRecords()
  return NextResponse.json(logs)
}
