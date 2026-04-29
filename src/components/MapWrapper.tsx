'use client'

import dynamic from 'next/dynamic'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useState } from 'react'

const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
    </div>
  )
})

interface MapWrapperProps {
  lat?: number
  lng?: number
  zoom?: number
}

export default function MapWrapper({ lat = 0, lng = 0, zoom = 12 }: MapWrapperProps) {
  const [errorState, setErrorState] = useState<{hasError: boolean, message?: string}>({ hasError: false })
  const [retrying, setRetrying] = useState(false)

  if (!lat || !lng) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-xl">
        <p className="text-white/60 text-sm">Sin ubicación disponible</p>
      </div>
    )
  }

  const handleError = () => {
    setErrorState({ hasError: true, message: 'Error cargando el mapa' })
  }

  const handleRetry = () => {
    setRetrying(true)
    setErrorState({ hasError: false })
    setTimeout(() => setRetrying(false), 1000)
  }

  if (errorState.hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-xl">
        <div className="p-3 rounded-full bg-red-500/20 mb-3">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <p className="text-white/80 text-sm mb-3">Error cargando el mapa</p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          <span>Reintentar</span>
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <InteractiveMap lat={lat} lng={lng} zoom={zoom} onError={handleError} />
    </div>
  )
}