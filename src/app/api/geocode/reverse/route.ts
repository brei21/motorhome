import { NextResponse } from 'next/server'

const coordinateLimit = {
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
}

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null
  return numeric
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const latitude = parseCoordinate(url.searchParams.get('latitude'), coordinateLimit.latitude.min, coordinateLimit.latitude.max)
  const longitude = parseCoordinate(url.searchParams.get('longitude'), coordinateLimit.longitude.min, coordinateLimit.longitude.max)

  if (latitude === null || longitude === null) {
    return NextResponse.json({ locality: null, error: 'Invalid coordinates' }, { status: 400 })
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'es',
  })

  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json({ locality: null }, { status: 200 })
    }

    const data = await response.json() as {
      city?: string
      locality?: string
      principalSubdivision?: string
      countryName?: string
    }
    const locality = data.city || data.locality || data.principalSubdivision || data.countryName || null

    return NextResponse.json({ locality })
  } catch {
    return NextResponse.json({ locality: null }, { status: 200 })
  }
}
