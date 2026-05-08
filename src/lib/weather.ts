export type WeatherSnapshot = {
  source: 'open-meteo'
  captured_at: string
  temperature_c: number | null
  apparent_temperature_c: number | null
  precipitation_mm: number | null
  wind_speed_kmh: number | null
  weather_code: number | null
  description: string
}

type OpenMeteoCurrent = {
  time?: string
  temperature_2m?: number
  apparent_temperature?: number
  precipitation?: number
  weather_code?: number
  wind_speed_10m?: number
}

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function describeWeatherCode(code: number | null | undefined) {
  if (code === 0) return 'Despejado'
  if (code === 1) return 'Mayormente despejado'
  if (code === 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code === 45 || code === 48) return 'Niebla'
  if ([51, 53, 55, 56, 57].includes(Number(code))) return 'Llovizna'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(Number(code))) return 'Lluvia'
  if ([71, 73, 75, 77, 85, 86].includes(Number(code))) return 'Nieve'
  if ([95, 96, 99].includes(Number(code))) return 'Tormenta'
  return 'Tiempo registrado'
}

export function normalizeOpenMeteoCurrent(payload: OpenMeteoResponse): WeatherSnapshot | null {
  const current = payload.current
  if (!current) return null

  const weatherCode = finiteNumber(current.weather_code)
  return {
    source: 'open-meteo',
    captured_at: typeof current.time === 'string' && current.time ? current.time : new Date().toISOString(),
    temperature_c: finiteNumber(current.temperature_2m),
    apparent_temperature_c: finiteNumber(current.apparent_temperature),
    precipitation_mm: finiteNumber(current.precipitation),
    wind_speed_kmh: finiteNumber(current.wind_speed_10m),
    weather_code: weatherCode,
    description: describeWeatherCode(weatherCode),
  }
}

export function formatWeatherSummary(snapshot: WeatherSnapshot | null | undefined) {
  if (!snapshot) return 'Tiempo no disponible'
  const temperature = snapshot.temperature_c !== null ? `${Math.round(snapshot.temperature_c)}°C` : null
  return [temperature, snapshot.description].filter(Boolean).join(' · ') || snapshot.description
}
