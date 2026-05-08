import assert from 'node:assert/strict'
import {
  describeWeatherCode,
  normalizeOpenMeteoCurrent,
} from '../src/lib/weather.ts'

assert.equal(describeWeatherCode(0), 'Despejado')
assert.equal(describeWeatherCode(61), 'Lluvia')
assert.equal(describeWeatherCode(95), 'Tormenta')

const snapshot = normalizeOpenMeteoCurrent({
  latitude: 38.02952,
  longitude: 1.1481,
  current: {
    time: '2026-05-08T12:00',
    temperature_2m: 23.4,
    apparent_temperature: 22.8,
    precipitation: 0,
    weather_code: 1,
    wind_speed_10m: 13.2,
  },
})

assert.deepEqual(snapshot, {
  source: 'open-meteo',
  captured_at: '2026-05-08T12:00',
  temperature_c: 23.4,
  apparent_temperature_c: 22.8,
  precipitation_mm: 0,
  wind_speed_kmh: 13.2,
  weather_code: 1,
  description: 'Mayormente despejado',
})

console.log('weather verification ok')
