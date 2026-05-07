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

async function reverseWithBigDataCloud(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'es',
  })
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) return null

  const data = await response.json() as {
    city?: string
    locality?: string
    principalSubdivision?: string
    countryName?: string
  }
  return data.city || data.locality || data.principalSubdivision || data.countryName || null
}

async function reverseWithNominatim(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '10',
    addressdetails: '1',
    accept_language: 'es',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      'User-Agent': 'motorhome-webapp/1.0',
    },
    next: { revalidate: 60 * 60 * 24 },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) return null

  const data = await response.json() as {
    address?: {
      city?: string
      town?: string
      village?: string
      municipality?: string
      county?: string
      state?: string
      country?: string
    }
  }
  const address = data.address ?? {}
  return address.city || address.town || address.village || address.municipality || address.county || address.state || address.country || null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const latitude = parseCoordinate(url.searchParams.get('latitude'), coordinateLimit.latitude.min, coordinateLimit.latitude.max)
  const longitude = parseCoordinate(url.searchParams.get('longitude'), coordinateLimit.longitude.min, coordinateLimit.longitude.max)

  if (latitude === null || longitude === null) {
    return NextResponse.json({ locality: null, error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const locality = await reverseWithBigDataCloud(latitude, longitude)
      || await reverseWithNominatim(latitude, longitude)

    return NextResponse.json({ locality })
  } catch {
    return NextResponse.json({ locality: null }, { status: 200 })
  }
}
