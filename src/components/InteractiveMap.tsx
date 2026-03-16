'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in leaflet with next/image
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

// Component to recenter map when coords change
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
}

export default function InteractiveMap({ lat, lng, zoom = 12, className = '' }: InteractiveMapProps) {
  // Fix Next.js SSR hydration issue with Leaflet by ensuring it only renders on client
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', height: '100%', width: '100%', borderRadius: 'inherit' }}>
        <span style={{ color: 'white' }}>Cargando mapa...</span>
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
        zoomControl={false} // Disable zoom control for cleaner dashboard look
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
