export interface StoredLocation {
  latitude: number
  longitude: number
  accuracy: number | null
  capturedAt: string
  locality?: string | null
}

const STORAGE_KEY = 'motorhome:last-location'
const MAX_LOCATION_AGE_MS = 30 * 60 * 1000

function isStoredLocation(value: unknown): value is StoredLocation {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredLocation>
  return typeof candidate.latitude === 'number'
    && typeof candidate.longitude === 'number'
    && typeof candidate.capturedAt === 'string'
}

export function formatStoredLocation(location: StoredLocation) {
  if (location.locality) return location.locality
  return formatCoordinates(location)
}

export function formatCoordinates(location: Pick<StoredLocation, 'latitude' | 'longitude'>) {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
}

export function saveStoredLocation(location: Omit<StoredLocation, 'capturedAt'>) {
  if (typeof window === 'undefined') return

  const payload: StoredLocation = {
    ...location,
    capturedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function getStoredLocation() {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as unknown
    if (!isStoredLocation(parsed)) return null

    const age = Date.now() - new Date(parsed.capturedAt).getTime()
    if (!Number.isFinite(age) || age > MAX_LOCATION_AGE_MS) return null

    return parsed
  } catch {
    return null
  }
}

export function positionToStoredLocation(position: GeolocationPosition): Omit<StoredLocation, 'capturedAt'> {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
  }
}

export async function resolveMunicipality(location: Pick<StoredLocation, 'latitude' | 'longitude'>) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    localityLanguage: 'es',
  })

  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
      signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) return null

    const data = await response.json() as {
      city?: string
      locality?: string
      principalSubdivision?: string
      countryName?: string
    }
    return data.city || data.locality || data.principalSubdivision || data.countryName || null
  } catch {
    return null
  }
}
