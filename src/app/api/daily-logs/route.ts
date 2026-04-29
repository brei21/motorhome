import { NextResponse } from 'next/server'
import { getDailyRecords } from '@/app/actions/daily-records'

export async function GET() {
  const logs = await getDailyRecords(50)
  return NextResponse.json(logs)
}
