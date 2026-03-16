'use client'

import dynamic from 'next/dynamic'

// Leaflet relies on the window object, so we MUST dynamically import it 
// with ssr: false to prevent Next.js from throwing errors on the server build
const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
      <p style={{ color: 'white', fontWeight: 600 }}>Cargando mapa...</p>
    </div>
  )
})

export default InteractiveMap
