import { NextResponse } from 'next/server'
import { getLpgRecords } from '@/app/actions/lpg-records'

export async function GET() {
  const logs = await getLpgRecords()
  return NextResponse.json(logs)
}
