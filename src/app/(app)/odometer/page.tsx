'use client'

import { useState, useEffect } from 'react'
import { createOdometerRecord } from '@/app/actions/odometer-records'
import { Loader2, CheckCircle2, CalendarCheck, FileText, Navigation, MapPin, Flag, Search, Plus, X, MousePointerClick } from 'lucide-react'
import RouteMapWrapper from '@/components/RouteMapWrapper'
import { Waypoint } from '@/components/RouteMap'
import styles from './page.module.css'

export default function OdometerPage() {
  // Odometer state
  const [kmLoading, setKmLoading] = useState(false)
  const [kmSuccess, setKmSuccess] = useState(false)
  const [kilometers, setKilometers] = useState('')
  const [notes, setNotes] = useState('')

  // Route state
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>()
  const [pendingLat, setPendingLat] = useState<number | null>(null)
  const [pendingLng, setPendingLng] = useState<number | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [newWpType, setNewWpType] = useState<'start' | 'intermediate' | 'end'>('start')
  const [distances, setDistances] = useState<number[]>([]) // Distances in meters between points
  const [totalDistance, setTotalDistance] = useState<number>(0)

  // Get GPS
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  // Auto-set next type
  useEffect(() => {
    const hasStart = waypoints.some(w => w.type === 'start')
    const hasEnd = waypoints.some(w => w.type === 'end')
    if (!hasStart) setNewWpType('start')
    else if (!hasEnd) setNewWpType('end')
    else setNewWpType('intermediate')
  }, [waypoints])

  useEffect(() => {
    if (waypoints.length < 2) { 
      setRouteGeometry([]); 
      setDistances([]);
      setTotalDistance(0);
      return 
    }
    const run = async () => {
      try {
        const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';')
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        const data = await res.json()
        if (data.code === 'Ok' && data.routes?.length > 0) {
          setRouteGeometry(data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]))
          setDistances(data.routes[0].legs.map((leg: any) => leg.distance))
          setTotalDistance(data.routes[0].distance)
        }
      } catch {}
    }
    run()
  }, [waypoints])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const d = await res.json()
      if (d?.address) return d.address.city || d.address.town || d.address.village || d.address.county || 'Lugar desconocido'
    } catch {}
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
  }

  const handleMapClick = async (lat: number, lng: number) => {
    setPendingLat(lat); setPendingLng(lng)
    setPendingName(await reverseGeocode(lat, lng))
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      const data = await res.json()
      if (data?.length > 0) {
        setPendingLat(parseFloat(data[0].lat))
        setPendingLng(parseFloat(data[0].lon))
        setPendingName(data[0].display_name?.split(',')[0] || searchQuery)
        setSearchQuery('')
      } else { alert('No se encontró') }
    } catch { alert('Error buscando') }
    finally { setIsSearching(false) }
  }

  const handleAddWaypoint = () => {
    if (pendingLat === null || pendingLng === null) return
    const wp: Waypoint = { id: Date.now().toString(), name: pendingName, lat: pendingLat, lng: pendingLng, type: newWpType }
    setWaypoints(prev => {
      const base = newWpType === 'start' ? prev.filter(w => w.type !== 'start')
                 : newWpType === 'end' ? prev.filter(w => w.type !== 'end') : prev
      const starts = base.filter(w => w.type === 'start')
      const stops = base.filter(w => w.type === 'intermediate')
      const ends = base.filter(w => w.type === 'end')
      if (newWpType === 'start') return [wp, ...stops, ...ends]
      if (newWpType === 'end') return [...starts, ...stops, wp]
      return [...starts, ...stops, wp, ...ends]
    })
    setPendingLat(null); setPendingLng(null); setPendingName('')
  }

  const handleSubmitKm = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(kilometers, 10)
    if (isNaN(val) || val <= 0) return
    setKmLoading(true); setKmSuccess(false)
    try {
      await createOdometerRecord({ date: new Date().toISOString().split('T')[0], kilometers: val, notes: notes || null })
      setKmSuccess(true); setNotes('')
      setTimeout(() => setKmSuccess(false), 3000)
    } catch (err: any) { alert(err.message || 'Error') }
    finally { setKmLoading(false) }
  }

  const typeLabel = (t: Waypoint['type']) => t === 'start' ? 'Salida' : t === 'end' ? 'Destino' : 'Parada'

  return (
    <div className={styles.container}>

      {/* ── TOP ROW: Route Planner (left) + Odometer (right) ── */}
      <div className={styles.topWidgets}>

        {/* LEFT: Route Planner */}
        <section className={`bento-card animate-slide-up ${styles.routeSection}`} style={{ animationDelay: '0.1s' }}>
          <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
            <Navigation size={18} /> Planificador de Ruta
          </span>

          {/* Search */}
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar ciudad, camping..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className={styles.searchBtn} onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 size={15} className="spinning" /> : <Search size={15} />}
            </button>
          </div>

          {/* Waypoints list */}
          <div className={styles.waypointsList}>
            {waypoints.length === 0 ? (
              <div className={styles.emptyHint}>
                <Navigation size={28} style={{ opacity: 0.25 }} />
                <span className="text-subhead">Busca un lugar o haz clic en el mapa</span>
              </div>
            ) : (
              waypoints.map((wp, idx) => (
                <div key={wp.id} className={styles.waypointRow}>
                  <div className={styles.connector}>
                    <div className={`${styles.dot} ${wp.type === 'start' ? styles.dotStart : wp.type === 'end' ? styles.dotEnd : styles.dotStop}`} />
                    {idx < waypoints.length - 1 && <div className={styles.line} />}
                  </div>
                  <div className={styles.wpInfo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={styles.wpLabel}>{typeLabel(wp.type)}</span>
                      {idx > 0 && distances[idx - 1] !== undefined && (
                        <span className="text-subhead" style={{ fontSize: '11px', color: 'var(--bento-green)', fontWeight: 700 }}>
                          +{(distances[idx - 1] / 1000).toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <span className={styles.wpName}>{wp.name}</span>
                  </div>
                  <button className={styles.removeBtn} onClick={() => setWaypoints(p => p.filter(w => w.id !== wp.id))}>
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add point area */}
          <div className={styles.addArea}>
            {pendingLat !== null ? (
              <>
                <div className={styles.pendingCard}>
                  <MapPin size={14} color="#4285F4" style={{ flexShrink: 0 }} />
                  <span className={styles.pendingName}>{pendingName}</span>
                  <button className={styles.clearPendingBtn} onClick={() => { setPendingLat(null); setPendingLng(null); setPendingName('') }}>
                    <X size={13} />
                  </button>
                </div>
                <div className={styles.typeChips}>
                  {(['start', 'intermediate', 'end'] as const).map(t => (
                    <button key={t} className={`${styles.typeChip} ${newWpType === t ? styles.chipActive : ''}`} onClick={() => setNewWpType(t)}>
                      {t === 'start' ? '🟢 Salida' : t === 'end' ? '🔴 Destino' : '🔵 Parada'}
                    </button>
                  ))}
                </div>
                <button className={styles.addBtn} onClick={handleAddWaypoint}>
                  <Plus size={14} /> Añadir punto
                </button>
              </>
            ) : (
              <div className={styles.clickHint}>
                <MousePointerClick size={13} />
                <span>Haz clic en el mapa para añadir un punto</span>
              </div>
            )}
            {waypoints.length > 0 && (
              <button className={styles.clearRouteBtn} onClick={() => { setWaypoints([]); setRouteGeometry([]) }}>
                Limpiar ruta completa
              </button>
            )}
          </div>
        </section>

        {/* RIGHT: Odometer */}
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.15s', background: 'var(--bento-yellow)' }}>
          <div className={styles.kmDisplay}>
            <span className="text-subhead" style={{ color: 'rgba(0,0,0,0.6)' }}>Odómetro Actual</span>
            <span className="text-title-2" style={{ color: 'black' }}>15,234 <span className="text-body">km</span></span>
          </div>

          {kmSuccess && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 color="black" size={18} />
              <span className="text-headline" style={{ color: 'black' }}>¡Guardado!</span>
            </div>
          )}

          <form onSubmit={handleSubmitKm} className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <label className="text-headline" style={{ color: 'black' }}>Actualizar Marcador</label>
              <div className={styles.inputWrapper}>
                <CalendarCheck className={styles.inputIcon} size={18} color="black" />
                <input type="number" className={`${styles.bentoInput} ${styles.withIcon}`} placeholder="Ej. 15300" value={kilometers} onChange={e => setKilometers(e.target.value)} disabled={kmLoading} min="0" required />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className="text-headline" style={{ color: 'black' }}>Notas de Etapa</label>
              <div className={styles.inputWrapper}>
                <FileText className={styles.inputIcon} size={18} color="black" />
                <input type="text" className={`${styles.bentoInput} ${styles.withIcon}`} placeholder="Llegada a Berlín" value={notes} onChange={e => setNotes(e.target.value)} disabled={kmLoading} />
              </div>
            </div>
            <button type="submit" className={styles.submitButton} disabled={kmLoading || !kilometers}>
              {kmLoading && !kmSuccess ? <Loader2 size={18} className="spinning" /> : 'Registrar Etapa'}
            </button>
          </form>
        </section>
      </div>

      {/* ── BOTTOM: Full-width Map ── */}
      <section className={styles.mapSection}>
        <RouteMapWrapper
          waypoints={waypoints}
          routeGeometry={routeGeometry}
          currentLocation={currentLocation}
          onMapClick={handleMapClick}
          className={styles.mapContainer}
          style={{ height: '100%', width: '100%' }}
        />
        {waypoints.length > 0 && (
          <div className={styles.overlayPill}>
            <Navigation size={13} /> 
            {totalDistance > 0 ? (
              <strong>{(totalDistance / 1000).toFixed(1)} km totales</strong>
            ) : (
              <span>{waypoints.length} punto{waypoints.length !== 1 ? 's' : ''}</span>
            )}
            {routeGeometry.length > 0 && ' · Ruta calculada ✓'}
          </div>
        )}
      </section>

    </div>
  )
}
