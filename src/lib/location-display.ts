export type CoordinatePair = {
  latitude: number
  longitude: number
}

const plainCoordinatePattern = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/
const degreeCoordinatePattern = /^\s*(\d{1,2}(?:[.,]\d+)?)\s*°?\s*([NS])\s*,\s*(\d{1,3}(?:[.,]\d+)?)\s*°?\s*([EOW])\s*$/i

function parseLocalizedNumber(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function inRange(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

export function parseCoordinateText(value: string | null | undefined): CoordinatePair | null {
  const text = String(value || '').trim()
  if (!text) return null

  const plainMatch = text.match(plainCoordinatePattern)
  if (plainMatch) {
    const latitude = parseLocalizedNumber(plainMatch[1])
    const longitude = parseLocalizedNumber(plainMatch[2])
    if (latitude !== null && longitude !== null && inRange(latitude, longitude)) {
      return { latitude, longitude }
    }
  }

  const degreeMatch = text.match(degreeCoordinatePattern)
  if (degreeMatch) {
    const rawLatitude = parseLocalizedNumber(degreeMatch[1])
    const rawLongitude = parseLocalizedNumber(degreeMatch[3])
    if (rawLatitude === null || rawLongitude === null) return null

    const latitude = degreeMatch[2].toUpperCase() === 'S' ? -rawLatitude : rawLatitude
    const longitude = ['O', 'W'].includes(degreeMatch[4].toUpperCase()) ? -rawLongitude : rawLongitude
    if (inRange(latitude, longitude)) {
      return { latitude, longitude }
    }
  }

  return null
}

export function isCoordinateText(value: string | null | undefined) {
  return parseCoordinateText(value) !== null
}

export function formatHeroCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return null
  const latHemisphere = latitude < 0 ? 'S' : 'N'
  const lngHemisphere = longitude < 0 ? 'O' : 'E'
  return `${Math.abs(latitude).toFixed(5)}° ${latHemisphere}, ${Math.abs(longitude).toFixed(5)}° ${lngHemisphere}`
}
