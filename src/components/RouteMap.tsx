'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
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

const currentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: `<div style="width: 16px; height: 16px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export interface Waypoint {
  id: string
  name: string
  lat: number
  lng: number
  type: 'start' | 'intermediate' | 'end'
}

export interface RouteMapProps {
  waypoints: Waypoint[]
  routeGeometry?: [number, number][]
  currentLocation?: { lat: number, lng: number }
  onMapClick?: (lat: number, lng: number) => void
  className?: string
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [points, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Force Leaflet to recalculate its size after a short delay
    // to ensure the parent container's layout has settled.
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function RouteMap({ waypoints, routeGeometry, currentLocation, onMapClick, className = '' }: RouteMapProps) {
  const positionsToDraw: [number, number][] = routeGeometry && routeGeometry.length > 0 
    ? routeGeometry 
    : waypoints.map(w => [w.lat, w.lng])

  return (
    <div className={className} style={{ height: '100%', minHeight: '550px', width: '100%', overflow: 'hidden' }}>
      <MapContainer 
        center={positionsToDraw.length > 0 ? positionsToDraw[0] : [41.3851, 2.1734]} 
        zoom={6} 
        scrollWheelZoom={true} 
        style={{ height: '100%', minHeight: '550px', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {waypoints.map((waypoint) => (
          <Marker key={waypoint.id} position={[waypoint.lat, waypoint.lng]} icon={icon}>
            <Popup>
              <strong>{waypoint.name}</strong><br/>
              {waypoint.type === 'start' ? 'Salida' : waypoint.type === 'end' ? 'Destino' : 'Parada'}
            </Popup>
          </Marker>
        ))}

        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon}>
            <Popup>Tu ubicación actual</Popup>
          </Marker>
        )}

        <MapClickHandler onClick={onMapClick} />
        <MapResizer />

        {positionsToDraw.length > 1 && (
          <Polyline positions={positionsToDraw} pathOptions={{ color: 'var(--bento-green)', weight: 4 }} />
        )}

        {positionsToDraw.length > 0 && <MapBoundsFitter points={positionsToDraw} />}
      </MapContainer>
    </div>
  )
}
