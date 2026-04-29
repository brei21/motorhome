import { NextResponse } from 'next/server'
import { getCurrentOdometer } from '@/app/actions/odometer-records'

export async function GET() {
  const value = await getCurrentOdometer()
  return NextResponse.json({ value })
}
