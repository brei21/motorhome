'use client'

import { useEffect, useState } from 'react'

interface WeatherData {
  temp: number
  description: string
}

const WMO_CODES: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  61: 'Lluvia leve',
  63: 'Lluvia moderada',
  65: 'Lluvia fuerte',
  71: 'Nieve leve',
  73: 'Nieve moderada',
  75: 'Nieve fuerte',
  95: 'Tormenta',
}

export default function WeatherWidget({ lat = 41.3851, lng = 2.1734 }: { lat?: number, lng?: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [cityName, setCityName] = useState<string>('Buscando ubicación...')
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
        const weatherData = await weatherRes.json()
        
        let tempWeather = null
        if (weatherData && weatherData.current_weather) {
          tempWeather = {
            temp: Math.round(weatherData.current_weather.temperature),
            description: WMO_CODES[weatherData.current_weather.weathercode] || 'Desconocido'
          }
          setWeather(tempWeather)
        }

        // Fetch City Name via Reverse Geocoding (Nominatim)
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          const geoData = await geoRes.json()
          
          if (geoData && geoData.address) {
            const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || 'Desconocida'
            setCityName(city)
          } else {
            setCityName('Ubicación Desconocida')
          }
        } catch (geoErr) {
          console.error('Geocoding error:', geoErr)
          setCityName('Ubicación (' + lat.toFixed(1) + ',' + lng.toFixed(1) + ')')
        }

      } catch (err) {
        console.error(err)
        setError(true)
      }
    }
    fetchData()
  }, [lat, lng])

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="text-subhead" style={{ color: 'var(--text-primary)'}}>Comprobando...</span>
          <span className="text-body">Error API</span>
        </div>
        <span className="text-title-1">--º</span>
      </div>
    )
  }

  if (!weather) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="text-subhead" style={{ color: 'var(--text-primary)'}}>Comprobando...</span>
          <span className="text-body">Cargando</span>
        </div>
        <span className="text-title-1">--º</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="text-subhead" style={{ color: 'var(--text-primary)'}}>{cityName}</span>
        <span className="text-body">{weather.description}</span>
      </div>
      <span className="text-title-1">{weather.temp}º</span>
    </div>
  )
}

