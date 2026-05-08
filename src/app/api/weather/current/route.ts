import { NextResponse } from 'next/server'
import { normalizeOpenMeteoCurrent } from '@/lib/weather'

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null
  return numeric
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const latitude = parseCoordinate(url.searchParams.get('latitude'), -90, 90)
  const longitude = parseCoordinate(url.searchParams.get('longitude'), -180, 180)

  if (latitude === null || longitude === null) {
    return NextResponse.json({ weather: null, error: 'Invalid coordinates' }, { status: 400 })
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    timezone: 'auto',
  })

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 10 * 60 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json({ weather: null }, { status: 200 })
    }

    const weather = normalizeOpenMeteoCurrent(await response.json())
    return NextResponse.json({ weather })
  } catch {
    return NextResponse.json({ weather: null }, { status: 200 })
  }
}
