export interface StoredLocation {
  latitude: number
  longitude: number
  accuracy: number | null
  capturedAt: string
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
