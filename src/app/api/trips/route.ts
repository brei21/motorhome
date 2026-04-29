import { NextResponse } from 'next/server'
import { getActiveTrip, listTrips, startTrip, endTrip } from '@/app/actions/trips'

export async function GET() {
  const [active, trips] = await Promise.all([
    getActiveTrip(),
    listTrips(50),
  ])
  return NextResponse.json({ active, trips })
}

export async function POST(request: Request) {
  const payload = await request.json()
  const trip = await startTrip({
    start_odometer: Number(payload.start_odometer),
    start_location: payload.start_location ?? null,
    notes: payload.notes ?? null,
    start_checklist: payload.start_checklist ?? {},
  })
  return NextResponse.json(trip)
}

export async function PUT(request: Request) {
  const payload = await request.json()
  const trip = await endTrip({
    trip_id: payload.trip_id,
    end_odometer: Number(payload.end_odometer),
    end_location: payload.end_location ?? null,
    notes: payload.notes ?? null,
    end_checklist: payload.end_checklist ?? {},
  })
  return NextResponse.json(trip)
}
