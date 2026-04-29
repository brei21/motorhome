'use client'

import { useEffect, useState } from 'react'
import { Loader2, MapPin, RotateCcw } from 'lucide-react'
import { positionToStoredLocation, saveStoredLocation } from '@/lib/client-location'
import styles from './page.module.css'

type LocationState =
  | { status: 'idle' | 'loading'; message: string }
  | { status: 'ready'; latitude: number; longitude: number; accuracy: number | null }
  | { status: 'error'; message: string }

export function CurrentLocationCard({ initialLocation }: { initialLocation: string }) {
  const [location, setLocation] = useState<LocationState>({
    status: 'idle',
    message: 'Preparando lectura GPS...',
  })

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocation({ status: 'error', message: 'Este navegador no permite geolocalizacion.' })
      return
    }

    setLocation({ status: 'loading', message: 'Solicitando permiso GPS a Safari...' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const stored = positionToStoredLocation(position)
        saveStoredLocation(stored)
        setLocation({
          status: 'ready',
          latitude: stored.latitude,
          longitude: stored.longitude,
          accuracy: stored.accuracy,
        })
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED
        setLocation({
          status: 'error',
          message: denied
            ? 'Safari no tiene permiso de ubicacion para esta web.'
            : 'No se pudo leer la ubicacion actual. Prueba de nuevo.',
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    )
  }

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const stored = positionToStoredLocation(position)
        saveStoredLocation(stored)
        setLocation({
          status: 'ready',
          latitude: stored.latitude,
          longitude: stored.longitude,
          accuracy: stored.accuracy,
        })
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED
        setLocation({
          status: 'error',
          message: denied
            ? 'Safari no tiene permiso de ubicacion para esta web.'
            : 'No se pudo leer la ubicacion actual. Prueba de nuevo.',
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    )
  }, [])

  return (
    <section className={styles.locationCard}>
      <MapPin size={18} />
      <div>
        <strong>Ubicacion actual</strong>
        {location.status === 'ready' ? (
          <span>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            {location.accuracy ? ` · precision ${Math.round(location.accuracy)} m` : ''}
          </span>
        ) : (
          <span>{location.message}</span>
        )}
        <small>Salida registrada: {initialLocation}</small>
      </div>
      <button className={styles.locationButton} type="button" onClick={requestLocation} disabled={location.status === 'loading'}>
        {location.status === 'loading' ? <Loader2 size={15} className={styles.spinning} /> : <RotateCcw size={15} />}
        <span>Actualizar</span>
      </button>
    </section>
  )
}
