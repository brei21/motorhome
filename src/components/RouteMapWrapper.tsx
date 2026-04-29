'use client'

import dynamic from 'next/dynamic'
import { type RouteMapProps } from './RouteMap'

// Leaflet relies on the window object, so we MUST dynamically import it 
// with ssr: false to prevent Next.js from throwing errors on the server build
const DynamicRouteMap = dynamic<RouteMapProps>(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Cargando mapa de ruta...</p>
    </div>
  )
})

export default function RouteMapWrapper(props: RouteMapProps) {
  return <DynamicRouteMap {...props} />
}
