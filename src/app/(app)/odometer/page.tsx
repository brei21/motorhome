'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createOdometerRecord } from '@/app/actions/odometer-records'
import type { Trip } from '@/app/actions/trips'
import type { FavoritePlace } from '@/app/actions/favorite-places'
import { Loader2, CheckCircle2, CalendarCheck, FileText, Navigation, MapPin, Search, Plus, X, MousePointerClick, Play, StopCircle } from 'lucide-react'
import RouteMapWrapper from '@/components/RouteMapWrapper'
import { Waypoint } from '@/components/RouteMap'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './page.module.css'

export default function OdometerPage() {
  const [tripLog, setTripLog] = useState<Trip[]>([])
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([])
  const [activeRemoteTrip, setActiveRemoteTrip] = useState<Trip | null>(null)
  const [tripLoading, setTripLoading] = useState(false)
  const [elapsedHours, setElapsedHours] = useState(0)

  // Odometer state
  const [kmLoading, setKmLoading] = useState(false)
  const [kmSuccess, setKmSuccess] = useState(false)
  const [kilometers, setKilometers] = useState('')
  const [notes, setNotes] = useState('')
  const [currentOdometer, setCurrentOdometer] = useState<number | null>(null)

  // Trip control
  const [tripStartOdo, setTripStartOdo] = useState('')
  const [tripEndOdo, setTripEndOdo] = useState('')
  const [tripLocation, setTripLocation] = useState('')
  const [startChecklist, setStartChecklist] = useState({
    fuel: false,
    water: false,
    gas: false,
    quickCheck: false,
  })
  const [endChecklist, setEndChecklist] = useState({
    odometer: false,
    costs: false,
    water: false,
    notes: false,
  })
  const [confirmEndTripOpen, setConfirmEndTripOpen] = useState(false)

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
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotice({ type, message })
    window.setTimeout(() => setNotice(null), 4200)
  }

  // Get GPS
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  const loadTrips = async () => {
    setTripLoading(true)
    try {
      const res = await fetch('/api/trips')
      const data = await res.json()
      setTripLog(data.trips || [])
      setActiveRemoteTrip(data.active || null)
    } catch (err) {
      console.error('No se pudieron cargar los viajes', err)
    } finally {
      setTripLoading(false)
    }
  }

  const loadOdometer = async () => {
    try {
      const res = await fetch('/api/odometer')
      const data = await res.json()
      setCurrentOdometer(typeof data.value === 'number' ? data.value : null)
    } catch (err) {
      console.error('No se pudo obtener el odómetro', err)
    }
  }

  const loadFavoritePlaces = async () => {
    try {
      const res = await fetch('/api/favorite-places')
      const data = (await res.json()) as FavoritePlace[]
      setFavoritePlaces(data)
    } catch (err) {
      console.error('No se pudieron cargar las paradas favoritas', err)
    }
  }

  useEffect(() => {
    loadTrips()
    loadOdometer()
    loadFavoritePlaces()
  }, [])

  useEffect(() => {
    if (!activeRemoteTrip || activeRemoteTrip.ended_at) {
      setElapsedHours(0)
      return
    }
    const tick = () => {
      const diff = Date.now() - new Date(activeRemoteTrip.started_at).getTime()
      setElapsedHours(Math.max(0, Math.round(diff / 1000 / 60 / 60)))
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [activeRemoteTrip])

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
        const data: {
          code: string
          routes?: {
            geometry: { coordinates: number[][] }
            legs: { distance: number }[]
            distance: number
          }[]
        } = await res.json()
        const routes = data.routes ?? []
        if (data.code === 'Ok' && routes.length > 0) {
          setRouteGeometry(routes[0].geometry.coordinates.map((c) => [c[1], c[0]] as [number, number]))
          setDistances(routes[0].legs.map((leg) => leg.distance))
          setTotalDistance(routes[0].distance)
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
      } else { showNotice('info', 'No se encontró ningún resultado para esa búsqueda.') }
    } catch { showNotice('error', 'Error buscando la ubicación. Intenta de nuevo.') }
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

  const handleSaveFavoritePlace = async () => {
    if (pendingLat === null || pendingLng === null || !pendingName.trim()) {
      showNotice('info', 'Selecciona primero un lugar del mapa o del buscador.')
      return
    }

    try {
      await fetch('/api/favorite-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingName,
          type: 'other',
          latitude: pendingLat,
          longitude: pendingLng,
        }),
      })
      await loadFavoritePlaces()
      showNotice('success', 'Parada favorita guardada.')
    } catch {
      showNotice('error', 'No se pudo guardar la parada favorita.')
    }
  }

  const handleSubmitKm = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(kilometers, 10)
    if (isNaN(val) || val <= 0) return
    setKmLoading(true); setKmSuccess(false)
    try {
      await createOdometerRecord({ date: new Date().toISOString().split('T')[0], kilometers: val, notes: notes || null })
      await loadOdometer()
      setKmSuccess(true); setNotes('')
      setTimeout(() => setKmSuccess(false), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) showNotice('error', err.message)
      else showNotice('error', 'No se pudo registrar el odómetro.')
    }
    finally { setKmLoading(false) }
  }

  const typeLabel = (t: Waypoint['type']) => t === 'start' ? 'Salida' : t === 'end' ? 'Destino' : 'Parada'

  const activeKm = activeRemoteTrip && kilometers
    ? Math.max(0, parseInt(kilometers || '0', 10) - activeRemoteTrip.start_odometer)
    : undefined
  const tripActive = !!activeRemoteTrip && !activeRemoteTrip.ended_at
  const formatNumber = (v: number | null) => (v === null ? '—' : v.toLocaleString('es-ES'))
  const dailyStatusLabel = (status: string) =>
    status === 'travel' ? 'De viaje' : status === 'parking' ? 'En parking' : 'En casa'

  const handleStartTrip = async () => {
    const startVal = parseInt(tripStartOdo, 10)
    if (isNaN(startVal) || startVal <= 0) return showNotice('info', 'Introduce un odómetro inicial válido.')
    setTripLoading(true)
    try {
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_odometer: startVal,
          start_location: tripLocation || null,
          start_checklist: startChecklist,
        }),
      })
      setTripStartOdo('')
      setTripLocation('')
      setStartChecklist({ fuel: false, water: false, gas: false, quickCheck: false })
      await loadTrips()
      showNotice('success', 'Viaje iniciado.')
    } catch (err) {
      console.error(err)
      showNotice('error', 'No se pudo iniciar el viaje.')
    } finally {
      setTripLoading(false)
    }
  }

  const handleEndTrip = async () => {
    const endVal = parseInt(tripEndOdo, 10)
    const activeId = activeRemoteTrip?.id ?? tripLog.find(t => !t.ended_at)?.id
    if (isNaN(endVal) || !activeId || !activeRemoteTrip) return showNotice('info', 'Introduce un odómetro final y asegúrate de tener un viaje activo.')
    if (endVal < activeRemoteTrip.start_odometer) return showNotice('info', 'El odómetro final no puede ser menor que el inicial.')
    setConfirmEndTripOpen(true)
  }

  const confirmEndTrip = async () => {
    const endVal = parseInt(tripEndOdo, 10)
    const activeId = activeRemoteTrip?.id ?? tripLog.find(t => !t.ended_at)?.id
    if (isNaN(endVal) || !activeId || !activeRemoteTrip || endVal < activeRemoteTrip.start_odometer) {
      setConfirmEndTripOpen(false)
      return
    }
    setTripLoading(true)
    try {
      await fetch('/api/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeId,
          end_odometer: endVal,
          end_location: tripLocation || null,
          end_checklist: endChecklist,
        }),
      })
      setTripEndOdo('')
      setTripLocation('')
      setEndChecklist({ odometer: false, costs: false, water: false, notes: false })
      setConfirmEndTripOpen(false)
      await loadTrips()
      showNotice('success', 'Viaje finalizado y guardado en la bitácora.')
    } catch (err) {
      console.error(err)
      showNotice('error', 'No se pudo cerrar el viaje.')
    } finally {
      setTripLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {notice && (
        <div className={styles.notice} data-type={notice.type} role="status">
          {notice.message}
        </div>
      )}

      <section className={`${styles.tripCard} bento-card`}>
        <div className={styles.tripIntro}>
          <div>
            <p className="text-title-3">Viaje</p>
            <p className={styles.tripHint}>
              {tripLoading ? 'Cargando estado del viaje…' : tripActive ? 'Viaje en curso' : 'No hay viaje activo'}
            </p>
          </div>
          {tripActive && <span className={styles.liveDot} aria-label="viaje activo" />}
        </div>

        <div className={styles.tripBody}>
          <div className={styles.tripForm}>
            <p className={styles.formLegend}>{tripActive ? 'Finalizar viaje' : 'Iniciar viaje'}</p>
            {!tripActive ? (
              <div className={styles.tripActions}>
                <input
                  type="number"
                  className={styles.bentoInput}
                  placeholder="Odómetro inicio (km)"
                  value={tripStartOdo}
                  onChange={e => setTripStartOdo(e.target.value)}
                  disabled={tripLoading}
                />
                <input
                  type="text"
                  className={styles.bentoInput}
                  placeholder="Ubicación de salida (opcional)"
                  value={tripLocation}
                  onChange={e => setTripLocation(e.target.value)}
                  disabled={tripLoading}
                />
                <div className={styles.checklistBox} aria-label="Checklist de inicio">
                  {[
                    ['fuel', 'Combustible revisado'],
                    ['water', 'Agua preparada'],
                    ['gas', 'Gas/bateria revisado'],
                    ['quickCheck', 'Revisión rápida exterior'],
                  ].map(([key, label]) => (
                    <label key={key} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={startChecklist[key as keyof typeof startChecklist]}
                        onChange={(event) =>
                          setStartChecklist((current) => ({ ...current, [key]: event.target.checked }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button className={styles.primaryBtn} onClick={handleStartTrip} disabled={tripLoading}>
                  <Play size={16} />
                  {tripLoading ? 'Guardando...' : 'Iniciar viaje'}
                </button>
              </div>
            ) : (
              <div className={styles.tripActions}>
                <input
                  type="number"
                  className={styles.bentoInput}
                  placeholder="Odómetro final (km)"
                  value={tripEndOdo}
                  onChange={e => setTripEndOdo(e.target.value)}
                  disabled={tripLoading}
                />
                <input
                  type="text"
                  className={styles.bentoInput}
                  placeholder="Ubicación de llegada (opcional)"
                  value={tripLocation}
                  onChange={e => setTripLocation(e.target.value)}
                  disabled={tripLoading}
                />
                <div className={styles.checklistBox} aria-label="Checklist de cierre">
                  {[
                    ['odometer', 'Odómetro final comprobado'],
                    ['costs', 'Gastos revisados'],
                    ['water', 'Aguas revisadas'],
                    ['notes', 'Notas del viaje completas'],
                  ].map(([key, label]) => (
                    <label key={key} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={endChecklist[key as keyof typeof endChecklist]}
                        onChange={(event) =>
                          setEndChecklist((current) => ({ ...current, [key]: event.target.checked }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button className={styles.ghostBtn} onClick={handleEndTrip} disabled={tripLoading}>
                  <StopCircle size={16} />
                  {tripLoading ? 'Guardando...' : 'Finalizar viaje'}
                </button>
              </div>
            )}
          </div>

          <div className={styles.tripHighlight}>
            {tripActive && activeRemoteTrip ? (
              <>
                <div>
                  <p className={styles.tripLabel}>Duración</p>
                  <p className={styles.tripValue}>{elapsedHours} h</p>
                </div>
                <div>
                  <p className={styles.tripLabel}>Recorrido</p>
                  <p className={styles.tripValue}>{activeKm !== undefined ? `${activeKm} km` : '— km'}</p>
                </div>
                <div>
                  <p className={styles.tripLabel}>Inicio</p>
                  <p className={styles.tripValue}>{activeRemoteTrip.started_at.slice(0, 10)}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className={styles.tripLabel}>Estado</p>
                  <p className={styles.tripValue}>{tripLoading ? 'Cargando...' : 'Listo para iniciar'}</p>
                </div>
                <div>
                  <p className={styles.tripLabel}>Odómetro total</p>
                  <p className={styles.tripValue}>{formatNumber(currentOdometer)} km</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className={styles.tripLogSection}>
        <div className={styles.tripLogHeader}>
          <div>
            <p className="text-headline">Bitácora de Viajes</p>
            <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
              {tripLoading
                ? 'Cargando bitácora...'
                : tripLog.length > 0
                  ? `${tripLog.length} viajes registrados`
                  : 'Aún no hay viajes guardados'}
            </p>
          </div>
        </div>
        <div className={styles.tripLogList}>
          {tripLoading && (
            <div className={styles.tripLogEmpty}>
              <Loader2 size={16} className="spinning" />
              <span className="text-subhead">Cargando viajes...</span>
            </div>
          )}
          {!tripLoading && tripLog.length === 0 && (
            <div className={styles.tripLogEmpty}>
              <Navigation size={16} />
              <span className="text-subhead">Cuando inicies o cierres un viaje aparecerá aquí.</span>
            </div>
          )}
          {!tripLoading && tripLog.map(t => {
            const km = t.end_odometer && t.start_odometer ? t.end_odometer - t.start_odometer : null
            const duration = t.ended_at
              ? Math.max(1, Math.ceil((new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 86400000))
              : null
            const startChecklistDone = Object.values(t.start_checklist ?? {}).filter(Boolean).length
            const endChecklistDone = Object.values(t.end_checklist ?? {}).filter(Boolean).length
            return (
              <div key={t.id} className={styles.tripLogItem}>
                <div className={styles.tripLogBadge}>
                  <Navigation size={14} />
                </div>
                <div className={styles.tripLogText}>
                  <p className="text-body" style={{ fontWeight: 700 }}>
                    <Link href={`/trips/${t.id}`}>
                      {t.start_location || 'Salida desconocida'} {t.end_location ? `→ ${t.end_location}` : ''}
                    </Link>
                  </p>
                  <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                    {t.started_at.slice(0, 10)} {t.ended_at ? `· ${t.ended_at.slice(0, 10)}` : '· en curso'}
                  </p>
                  <div className={styles.tripStatsRow}>
                    <span className={styles.tripStatPill}>{km !== null ? `${km} km` : '— km'}</span>
                    <span className={styles.tripStatPill}>{duration !== null ? `${duration} día${duration !== 1 ? 's' : ''}` : 'en curso'}</span>
                    <span className={styles.tripStatPill}>{t.daily_logs?.length ?? 0} registros</span>
                    <span className={styles.tripStatPill}>inicio {startChecklistDone}/4</span>
                    {t.ended_at && <span className={styles.tripStatPill}>cierre {endChecklistDone}/4</span>}
                  </div>
                  {t.daily_logs && t.daily_logs.length > 0 && (
                    <div className={styles.tripDailyList}>
                      {t.daily_logs.map(log => (
                        <div key={log.id} className={styles.tripDailyItem}>
                          <span className={styles.tripDailyDate}>{log.date}</span>
                          <span className={styles.tripDailyText}>
                            {dailyStatusLabel(log.status)}
                            {log.location_name ? ` · ${log.location_name}` : ''}
                          </span>
                          {log.notes && <span className={styles.tripDailyNote}>{log.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
                <button className={styles.favoriteBtn} onClick={handleSaveFavoritePlace}>
                  Guardar parada favorita
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
            <div className={styles.favoritePlacesBox}>
              <span className="text-subhead">Paradas favoritas</span>
              {favoritePlaces.length === 0 ? (
                <span className={styles.favoriteEmpty}>Guarda un punto del mapa para reutilizarlo.</span>
              ) : (
                <div className={styles.favoriteList}>
                  {favoritePlaces.slice(0, 5).map((place) => (
                    <button
                      key={place.id}
                      className={styles.favoritePlace}
                      onClick={() => {
                        if (place.latitude === null || place.longitude === null) return
                        setPendingLat(place.latitude)
                        setPendingLng(place.longitude)
                        setPendingName(place.name)
                      }}
                    >
                      {place.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: Odometer */}
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.15s' }}>
          <div className={styles.kmDisplay}>
            <span className="text-subhead" style={{ color: 'rgba(0,0,0,0.6)' }}>Odómetro Actual</span>
            <span className="text-title-2" style={{ color: 'black' }}>
              {formatNumber(currentOdometer)} <span className="text-body">km</span>
            </span>
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
                <input type="number" className={`${styles.bentoInput} ${styles.withIcon}`} placeholder="Km actuales" value={kilometers} onChange={e => setKilometers(e.target.value)} disabled={kmLoading} min="0" required />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className="text-headline" style={{ color: 'black' }}>Notas de Etapa</label>
              <div className={styles.inputWrapper}>
                <FileText className={styles.inputIcon} size={18} color="black" />
                <input type="text" className={`${styles.bentoInput} ${styles.withIcon}`} placeholder="Notas de etapa" value={notes} onChange={e => setNotes(e.target.value)} disabled={kmLoading} />
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

      <ActionDialog
        open={confirmEndTripOpen}
        title="Finalizar viaje"
        description="El viaje activo quedará cerrado en la bitácora. Podrás consultarlo después desde Ruta y desde el detalle del viaje."
        confirmLabel="Finalizar viaje"
        tone="danger"
        loading={tripLoading}
        onCancel={() => setConfirmEndTripOpen(false)}
        onConfirm={() => void confirmEndTrip()}
      />
    </div>
  )
}
