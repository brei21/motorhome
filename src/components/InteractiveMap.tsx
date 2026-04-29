'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

function RecenterAutomatically({lat, lng}: {lat: number, lng: number}) {
  const map = useMap();
   useEffect(() => {
     map.setView([lat, lng]);
   }, [lat, lng, map]);
   return null;
 }

interface InteractiveMapProps {
  lat: number
  lng: number
  zoom?: number
  className?: string
  onError?: (error: Error) => void
}

export default function InteractiveMap({ lat, lng, zoom = 12, className = '', onError }: InteractiveMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback((err: Error) => {
    setHasError(true)
    if (onError) {
      onError(err)
    }
  }, [onError])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        handleError(new Error('Coordenadas inválidas'))
        return
      }
      setIsMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [lat, lng, handleError])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => {
        if (e.message?.includes('leaflet') || e.message?.includes('map')) {
          handleError(new Error('Error cargando el mapa'))
        }
      })
    }
  }, [handleError])

  if (!isMounted) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', height: '100%', width: '100%', borderRadius: 'inherit' }}>
        <span style={{ color: 'white' }}>Cargando mapa...</span>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', height: '100%', width: '100%', borderRadius: 'inherit' }}>
        <span style={{ color: 'red' }}>Error cargando el mapa</span>
      </div>
    )
  }

  return (
    <div className={className} style={{ height: '100%', width: '100%', borderRadius: 'inherit', overflow: 'hidden' }}>
      <MapContainer 
        center={[lat, lng]} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>
            Ubicación Actual
          </Popup>
        </Marker>
        <RecenterAutomatically lat={lat} lng={lng} />
      </MapContainer>
    </div>
  )
}