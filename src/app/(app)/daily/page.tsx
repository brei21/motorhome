'use client'

import { useEffect, useState } from 'react'
import { createDailyRecord, type DailyRecordStatus, type DailyRecord } from '@/app/actions/daily-records'
import { Loader2, CheckCircle2, AlertCircle, Navigation, MapPin, Home } from 'lucide-react'
import { formatStoredLocation, getStoredLocation, positionToStoredLocation, saveStoredLocation, type StoredLocation } from '@/lib/client-location'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './page.module.css'

interface FieldErrors {
  accommodationCost?: string
  dailyExpenses?: string
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible en este navegador.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    })
  })
}

export default function DailyPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<DailyRecordStatus>('travel')
  const [locationName, setLocationName] = useState('')
  const [notes, setNotes] = useState('')
  const [visitedPlaces, setVisitedPlaces] = useState('')
  const [accommodationCost, setAccommodationCost] = useState('')
  const [dailyExpenses, setDailyExpenses] = useState('')
  const [dailyExpensesNotes, setDailyExpensesNotes] = useState('')
  const [greyWater, setGreyWater] = useState(false)
  const [blackWater, setBlackWater] = useState(false)
  const [freshWater, setFreshWater] = useState(false)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cachedLocation, setCachedLocation] = useState<StoredLocation | null>(null)
  const [editingRecord, setEditingRecord] = useState<{ id: string; notes: string } | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)

  const loadRecords = async () => {
    setRecordsLoading(true)
    try {
      const res = await fetch('/api/daily-logs')
      const data = (await res.json()) as DailyRecord[]
      setRecords(data)
    } catch (err) {
      console.error('No se pudieron cargar los registros', err)
    } finally {
      setRecordsLoading(false)
    }
  }

  const validateField = (field: string, value: string): string | undefined => {
    if ((field === 'accommodationCost' || field === 'dailyExpenses') && value) {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0) {
        return 'El importe debe ser un número positivo'
      }
      if (num > 10000) {
        return 'Importe excesivo. Revisa el valor'
      }
    }
    return undefined
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'accommodationCost') {
      setAccommodationCost(value)
      const err = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: err }))
    }
    if (field === 'dailyExpenses') {
      setDailyExpenses(value)
      const err = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: err }))
    }
  }

  const handleInputBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateField(
      field,
      field === 'accommodationCost' ? accommodationCost : field === 'dailyExpenses' ? dailyExpenses : ''
    )
    if (err) {
      setErrors(prev => ({ ...prev, [field]: err }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setGpsMessage(null)

    const costError = validateField('accommodationCost', accommodationCost)
    const dailyExpensesError = validateField('dailyExpenses', dailyExpenses)
    if (costError || dailyExpensesError) {
      setErrors({ accommodationCost: costError, dailyExpenses: dailyExpensesError })
      setTouched({ accommodationCost: true, dailyExpenses: true })
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      let latitude: number | null = null
      let longitude: number | null = null
      let resolvedLocationName = locationName || null

      if (status === 'travel') {
        try {
          const position = await getCurrentPosition()
          const stored = positionToStoredLocation(position)
          const capturedAt = new Date().toISOString()
          saveStoredLocation(stored)
          setCachedLocation({ ...stored, capturedAt })
          latitude = stored.latitude
          longitude = stored.longitude

          if (!resolvedLocationName) {
            resolvedLocationName = formatStoredLocation({ ...stored, capturedAt })
          }

          setGpsMessage('Ubicacion GPS guardada en la bitacora del viaje.')
        } catch {
          const stored = getStoredLocation()

          if (stored) {
            latitude = stored.latitude
            longitude = stored.longitude
            if (!resolvedLocationName) {
              resolvedLocationName = formatStoredLocation(stored)
            }
            setCachedLocation(stored)
            setGpsMessage('Registro guardado con la ultima ubicacion GPS autorizada.')
          }

          if (!resolvedLocationName) {
            setError('Para registrar un dia de viaje, activa el GPS o escribe una ubicacion manual.')
            return
          }

          if (!stored) {
            setGpsMessage('Registro guardado con ubicacion manual. El navegador no devolvio GPS.')
          }
        }
      }

      const isoDate = new Date().toISOString().split('T')[0]
      await createDailyRecord({
        date: isoDate,
        status,
        latitude,
        longitude,
        location_name: resolvedLocationName,
        notes: notes || null,
        accommodation_cost: accommodationCost ? parseFloat(accommodationCost) : null,
        daily_expenses: dailyExpenses ? parseFloat(dailyExpenses) : null,
        daily_expenses_notes: dailyExpensesNotes || null,
        visited_places: visitedPlaces
          .split(',')
          .map((place) => place.trim())
          .filter(Boolean),
        grey_water_emptied: greyWater,
        black_water_emptied: blackWater,
        fresh_water_filled: freshWater,
        tags: selectedTags,
        photo_urls: [],
      })
      
      setSuccess(true)
      setLocationName('')
      setNotes('')
      setVisitedPlaces('')
      setAccommodationCost('')
      setDailyExpenses('')
      setDailyExpensesNotes('')
      setGreyWater(false)
      setBlackWater(false)
      setFreshWater(false)
      setSelectedTags([])
      setTouched({})
      setErrors({})
      await loadRecords()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
      setError('Error guardando el registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
    const stored = getStoredLocation()
    setCachedLocation(stored)
    if (stored) {
      setLocationName((current) => current || formatStoredLocation(stored))
    }
  }, [])

  const hasError = (field: keyof FieldErrors) => touched[field] && errors[field]
  const templates = [
    { label: 'Día de ruta', value: 'Día de ruta con parada principal en ' },
    { label: 'Camping', value: 'Noche en camping. Servicios usados: ' },
    { label: 'Parking', value: 'Parking tranquilo. Ruido, seguridad y acceso: ' },
    { label: 'Área AC', value: 'Área de autocaravanas. Servicios, ruido y accesos: ' },
    { label: 'Avería', value: 'Incidencia detectada: ' },
    { label: 'Ferry/frontera', value: 'Trámite de ferry/frontera: ' },
  ]
  const availableTags = ['naturaleza', 'ciudad', 'avería', 'lluvia', 'camping', 'área AC', 'gasto alto', 'recomendado']
  const filteredRecords = records.filter((record) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return [record.location_name, record.notes, record.daily_expenses_notes, ...(record.visited_places ?? []), ...(record.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  async function updateDailyNote() {
    if (!editingRecord) return
    const response = await fetch('/api/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'daily_logs', id: editingRecord.id, values: { notes: editingRecord.notes } }),
    })
    if (!response.ok) {
      setError('No se pudo actualizar el registro. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setEditingRecord(null)
    await loadRecords()
  }

  async function deleteDailyRecord() {
    if (!deletingRecordId) return
    const response = await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'daily_logs', id: deletingRecordId }),
    })
    if (!response.ok) {
      setError('No se pudo borrar el registro. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setDeletingRecordId(null)
    await loadRecords()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Registro Diario</h1>
      </header>

      <div className={styles.stack}>
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 color="var(--accent-green)" />
              <span className="text-headline">Guardado hoy correctamente</span>
            </div>
          )}

          {error && (
            <div className={`${styles.errorBanner} animate-fade-in`}>
              <AlertCircle color="var(--accent-red)" />
              <span className="text-headline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.statusGrid}>
              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'travel' ? styles.statusActiveTravel : ''}`}
                onClick={() => setStatus('travel')}
                disabled={loading}
              >
                <div className={styles.statusIcon}><Navigation size={24} /></div>
                <span className="text-headline">De Viaje</span>
              </button>

              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'parking' ? styles.statusActiveParking : ''}`}
                onClick={() => setStatus('parking')}
                disabled={loading}
              >
                <div className={styles.statusIcon}><MapPin size={24} /></div>
                <span className="text-headline">En Parking</span>
              </button>

              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'vacation_home' ? styles.statusActiveHome : ''}`}
                onClick={() => setStatus('vacation_home')}
                disabled={loading}
              >
                <div className={styles.statusIcon}><Home size={24} /></div>
                <span className="text-headline">En Casa</span>
              </button>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Notas de Ubicación (Opcional)</label>
              <input 
                type="text" 
                className={styles.bentoInput}
                placeholder="Ubicacion actual o referencia"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                disabled={loading}
              />
              {status === 'travel' && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-blue)' }}>
                  {cachedLocation
                    ? `Se usará la última ubicación GPS autorizada: ${formatStoredLocation(cachedLocation)}.`
                    : 'Al guardar se solicitará permiso de GPS para asociar este registro al viaje activo.'}
                </p>
              )}
              {gpsMessage && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-green)' }}>
                  {gpsMessage}
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Bitácora del Día (Notas)</label>
              <div className={styles.templateRow}>
                {templates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    className={styles.templateChip}
                    onClick={() => setNotes((current) => current || template.value)}
                    disabled={loading}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
              <textarea 
                className={styles.bentoInput}
                placeholder="¿Qué tal ha ido la jornada de hoy?"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                style={{ resize: 'none' }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Detalles de la bitácora</label>
              <input
                type="text"
                className={styles.bentoInput}
                placeholder="Lugares visitados: Faro de Fisterra, playa de Langosteira..."
                value={visitedPlaces}
                onChange={(e) => setVisitedPlaces(e.target.value)}
                disabled={loading}
              />
              <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                Si dormiste en un área de autocaravanas, añádela aquí junto al resto de lugares visitados.
              </p>
              <div className={styles.templateRow}>
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.tagChip} ${active ? styles.tagChipActive : ''}`}
                      onClick={() =>
                        setSelectedTags((current) =>
                          active ? current.filter((item) => item !== tag) : [...current, tag]
                        )
                      }
                      disabled={loading}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Gasto de Alojamiento (Opcional)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, fontSize: 16, color: hasError('accommodationCost') ? 'var(--accent-red)' : 'var(--text-secondary)', zIndex: 2, fontWeight: 600 }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.bentoInput} ${hasError('accommodationCost') ? styles.bentoInputError : ''}`}
                  placeholder="0.00  (alojamiento o parking)"
                  value={accommodationCost}
                  onChange={(e) => handleInputChange('accommodationCost', e.target.value)}
                  onBlur={() => handleInputBlur('accommodationCost')}
                  disabled={loading}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              {hasError('accommodationCost') && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-red)' }}>
                  {errors.accommodationCost}
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Otros gastos del día (Opcional)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, fontSize: 16, color: hasError('dailyExpenses') ? 'var(--accent-red)' : 'var(--text-secondary)', zIndex: 2, fontWeight: 600 }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.bentoInput} ${hasError('dailyExpenses') ? styles.bentoInputError : ''}`}
                  placeholder="0.00  (comida, peajes, entradas, compras...)"
                  value={dailyExpenses}
                  onChange={(e) => handleInputChange('dailyExpenses', e.target.value)}
                  onBlur={() => handleInputBlur('dailyExpenses')}
                  disabled={loading}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <input
                type="text"
                className={styles.bentoInput}
                placeholder="Detalle opcional: mercado, peaje, museo..."
                value={dailyExpensesNotes}
                onChange={(e) => setDailyExpensesNotes(e.target.value)}
                disabled={loading}
              />
              {hasError('dailyExpenses') && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-red)' }}>
                  {errors.dailyExpenses}
                </p>
              )}
            </div>

            <div className={styles.waterToggles}>
              <span className="text-headline" style={{ marginBottom: 16, display: 'block' }}>Depósitos de Agua</span>
              
              <label className={styles.toggleRow}>
                <span className="text-body">Vaciado Aguas Grises</span>
                <input 
                  type="checkbox" 
                  className={styles.toggleCheck}
                  checked={greyWater} 
                  onChange={(e) => setGreyWater(e.target.checked)}
                  disabled={loading}
                />
              </label>

              <label className={styles.toggleRow}>
                <span className="text-body">Vaciado Aguas Negras</span>
                <input 
                  type="checkbox" 
                  className={styles.toggleCheck}
                  checked={blackWater} 
                  onChange={(e) => setBlackWater(e.target.checked)}
                  disabled={loading}
                />
              </label>

              <label className={styles.toggleRow}>
                <span className="text-body">Llenado Aguas Limpias</span>
                <input 
                  type="checkbox" 
                  className={styles.toggleCheck}
                  checked={freshWater} 
                  onChange={(e) => setFreshWater(e.target.checked)}
                  disabled={loading}
                />
              </label>
            </div>

            <button 
              type="submit" 
              className={`${styles.submitButton} interactive-element`}
              disabled={loading}
            >
              {loading && !success ? <Loader2 className="spinning" size={24} /> : 'Guardar Estado'}
            </button>
          </form>
        </section>

        <section className={`bento-card animate-slide-up ${styles.logSection}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.logHeader}>
            <div>
              <p className="text-headline">Bitácora</p>
              <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                {recordsLoading
                  ? 'Cargando bitácora...'
                  : records.length > 0
                    ? `Últimos ${records.length} registros`
                    : 'Aún no hay registros'}
              </p>
            </div>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Buscar notas o ubicaciones"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className={styles.logList} role="list" aria-label="Últimos registros">
            {recordsLoading && (
              <div className={styles.emptyState}>
                <Loader2 size={18} className="spinning" />
                <p className="text-subhead">Cargando registros...</p>
              </div>
            )}
            {!recordsLoading && records.length === 0 && (
              <div className={styles.emptyState}>
                <Navigation size={18} />
                <p className="text-subhead">Empieza tu primer día: elige estado, añade ubicación y guarda la bitácora.</p>
              </div>
            )}
            {!recordsLoading && records.length > 0 && filteredRecords.length === 0 && (
              <div className={styles.emptyState}>
                <Navigation size={18} />
                <p className="text-subhead">No hay resultados para esa búsqueda.</p>
              </div>
            )}
            {!recordsLoading && filteredRecords.map(item => (
              <article key={item.id} className={styles.logItem} role="listitem">
                <div className={styles.logBadge} data-status={item.status}>
                  {item.status === 'travel' ? <Navigation size={14} /> : item.status === 'vacation_home' ? <Home size={14} /> : <MapPin size={14} />}
                </div>
                <div className={styles.logText}>
                  <span className="text-body" style={{ fontWeight: 700 }}>
                    {item.status === 'travel' ? 'De Viaje' : item.status === 'parking' ? 'En Parking' : item.status === 'motorhome_area' ? 'Área AC' : 'En Casa'}
                  </span>
                  <span className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                    {item.date}{item.location_name ? ` · ${item.location_name}` : ''}
                  </span>
                  {item.visited_places && item.visited_places.length > 0 && (
                    <span className={styles.recordNote}>Visitado: {item.visited_places.join(', ')}</span>
                  )}
                  {item.notes && <span className={styles.recordNote}>{item.notes}</span>}
                  {(item.accommodation_cost || item.daily_expenses) && (
                    <span className={styles.recordNote}>
                      Gastos: {[
                        item.accommodation_cost ? `alojamiento ${Number(item.accommodation_cost).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : null,
                        item.daily_expenses ? `día ${Number(item.daily_expenses).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className={styles.tagList}>
                      {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  )}
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => setEditingRecord({ id: item.id, notes: item.notes ?? '' })}>Editar nota</button>
                    <button type="button" onClick={() => setDeletingRecordId(item.id)}>Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <ActionDialog
        open={Boolean(editingRecord)}
        title="Editar nota diaria"
        description="Actualiza la nota de este registro sin tocar la ubicación ni el viaje asociado."
        inputLabel="Nota"
        inputValue={editingRecord?.notes ?? ''}
        inputPlaceholder="Escribe la nota"
        confirmLabel="Guardar cambios"
        onInputChange={(value) => setEditingRecord((current) => current ? { ...current, notes: value } : current)}
        onCancel={() => setEditingRecord(null)}
        onConfirm={() => void updateDailyNote()}
      />
      <ActionDialog
        open={Boolean(deletingRecordId)}
        title="Borrar registro diario"
        description="Esta acción elimina el registro de forma permanente. No se puede deshacer salvo restaurando un backup."
        confirmLabel="Borrar registro"
        tone="danger"
        requiredText="BORRAR"
        onCancel={() => setDeletingRecordId(null)}
        onConfirm={() => void deleteDailyRecord()}
      />
    </div>
  )
}
