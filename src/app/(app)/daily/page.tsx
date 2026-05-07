'use client'

import { useEffect, useState } from 'react'
import { createDailyRecord, type DailyRecordStatus, type DailyRecord, type DailyStop } from '@/app/actions/daily-records'
import { Loader2, CheckCircle2, AlertCircle, Navigation, MapPin, Home, Plus, Trash2 } from 'lucide-react'
import { formatCoordinates, formatStoredLocation, getStoredLocation, positionToStoredLocation, resolveMunicipality, saveStoredLocation, type StoredLocation } from '@/lib/client-location'
import { ActionDialog } from '@/components/ui/action-dialog'
import { RecordEditDialog, type RecordEditField } from '@/components/ui/record-edit-dialog'
import {
  DAILY_EXPENSE_CATEGORIES,
  formatExpenseBreakdown,
  normalizeExpenseBreakdown,
  sumExpenseBreakdown,
  type DailyExpenseBreakdown,
  type DailyExpenseCategoryKey,
} from '@/lib/expense-categories'
import styles from './page.module.css'

interface FieldErrors {
  accommodationCost?: string
  dailyExpenses?: string
}

type StopDraft = DailyStop & { key: string }
type ExpenseInputs = Record<DailyExpenseCategoryKey, string>

function emptyExpenseInputs(): ExpenseInputs {
  return DAILY_EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = ''
    return acc
  }, {} as ExpenseInputs)
}

function expenseInputsToBreakdown(inputs: ExpenseInputs): DailyExpenseBreakdown {
  return DAILY_EXPENSE_CATEGORIES.reduce<DailyExpenseBreakdown>((acc, category) => {
    const amount = Number.parseFloat(inputs[category.key])
    if (Number.isFinite(amount) && amount > 0) {
      acc[category.key] = amount
    }
    return acc
  }, {})
}

function breakdownToExpenseInputs(value: unknown): ExpenseInputs {
  const breakdown = normalizeExpenseBreakdown(value)
  return DAILY_EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = breakdown[category.key] ? String(breakdown[category.key]) : ''
    return acc
  }, {} as ExpenseInputs)
}

function formatMoney(value: number) {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const baseStops = (): StopDraft[] => [
  { key: 'start', type: 'start', name: '', notes: '' },
  { key: 'visit-1', type: 'visit', name: '', notes: '' },
  { key: 'overnight', type: 'overnight', name: '', notes: '' },
]

const stopLabels: Record<DailyStop['type'], string> = {
  start: 'Salida / despertar',
  visit: 'Parada visitada',
  overnight: 'Pernocta / dormir',
  service: 'Servicio',
  other: 'Otro',
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
  const [stops, setStops] = useState<StopDraft[]>(baseStops)
  const [accommodationCost, setAccommodationCost] = useState('')
  const [dailyExpenseInputs, setDailyExpenseInputs] = useState<ExpenseInputs>(emptyExpenseInputs)
  const [dailyExpensesNotes, setDailyExpensesNotes] = useState('')
  const [greyWater, setGreyWater] = useState(false)
  const [blackWater, setBlackWater] = useState(false)
  const [freshWater, setFreshWater] = useState(false)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cachedLocation, setCachedLocation] = useState<StoredLocation | null>(null)
  const [editingRecord, setEditingRecord] = useState<({
    id: string
    date: string
    status: DailyRecordStatus
    location_name: string
    notes: string
    accommodation_cost: string
    daily_expenses_notes: string
    visited_places: string
    tags: string
    grey_water_emptied: boolean
    black_water_emptied: boolean
    fresh_water_filled: boolean
  } & Record<string, string | boolean>) | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)

  const dailyExpenseBreakdown = expenseInputsToBreakdown(dailyExpenseInputs)
  const dailyExpensesTotal = sumExpenseBreakdown(dailyExpenseBreakdown)

  const updateStop = (key: string, patch: Partial<DailyStop>) => {
    setStops((current) => current.map((stop) => stop.key === key ? { ...stop, ...patch } : stop))
  }

  const addVisitStop = () => {
    setStops((current) => [
      ...current.slice(0, -1),
      { key: `visit-${Date.now()}`, type: 'visit', name: '', notes: '' },
      current[current.length - 1],
    ])
  }

  const removeStop = (key: string) => {
    setStops((current) => current.filter((stop) => stop.key !== key))
  }

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

  const updateDailyExpense = (key: DailyExpenseCategoryKey, value: string) => {
    setDailyExpenseInputs((current) => ({ ...current, [key]: value }))
    const err = validateField('dailyExpenses', value)
    setErrors(prev => ({ ...prev, dailyExpenses: err }))
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'accommodationCost') {
      setAccommodationCost(value)
      const err = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: err }))
    }
  }

  const handleInputBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateField(
      field,
      field === 'accommodationCost' ? accommodationCost : field === 'dailyExpenses' ? String(dailyExpensesTotal || '') : ''
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
    const dailyExpensesError = validateField('dailyExpenses', String(dailyExpensesTotal || ''))
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
          const locality = await resolveMunicipality(stored)
          const storedWithLocality = { ...stored, locality }
          saveStoredLocation(storedWithLocality)
          setCachedLocation({ ...storedWithLocality, capturedAt })
          latitude = stored.latitude
          longitude = stored.longitude

          if (!resolvedLocationName) {
            resolvedLocationName = locality || formatCoordinates(stored)
          }

          setGpsMessage(locality ? `Ubicacion GPS guardada: ${locality}.` : 'Ubicacion GPS guardada en la bitacora del viaje.')
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
      const normalizedStops = stops
        .map(({ type, name, notes }) => ({ type, name: name.trim(), notes: notes?.trim() || null }))
        .filter((stop) => stop.name)
      const fallbackVisitedPlaces = visitedPlaces
        .split(',')
        .map((place) => place.trim())
        .filter(Boolean)
      await createDailyRecord({
        date: isoDate,
        status,
        latitude,
        longitude,
        location_name: resolvedLocationName,
        notes: notes || null,
        accommodation_cost: accommodationCost ? parseFloat(accommodationCost) : null,
        daily_expenses: dailyExpensesTotal > 0 ? dailyExpensesTotal : null,
        daily_expenses_notes: dailyExpensesNotes || null,
        daily_expense_breakdown: dailyExpenseBreakdown,
        visited_places: fallbackVisitedPlaces.length ? fallbackVisitedPlaces : normalizedStops.map((stop) => stop.name),
        stops: normalizedStops,
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
      setStops(baseStops())
      setAccommodationCost('')
      setDailyExpenseInputs(emptyExpenseInputs())
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
    return [
      record.location_name,
      record.notes,
      record.daily_expenses_notes,
      ...formatExpenseBreakdown(normalizeExpenseBreakdown(record.daily_expense_breakdown)).flatMap((expense) => [
        expense.label,
        String(expense.amount),
      ]),
      ...(record.visited_places ?? []),
      ...(record.stops ?? []).flatMap((stop) => [stop.name, stop.notes]),
      ...(record.tags ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const dailyEditFields: RecordEditField[] = [
    { name: 'date', label: 'Fecha', type: 'date' },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'travel', label: 'De viaje' },
        { value: 'parking', label: 'Parking' },
        { value: 'motorhome_area', label: 'Área AC' },
        { value: 'vacation_home', label: 'En casa' },
      ],
    },
    { name: 'location_name', label: 'Municipio o ubicación', placeholder: 'Girona, Área AC...', fullWidth: true },
    { name: 'notes', label: 'Bitácora', type: 'textarea', placeholder: 'Notas del día', fullWidth: true },
    { name: 'accommodation_cost', label: 'Alojamiento', type: 'number', step: '0.01', min: '0', placeholder: '18.00' },
    ...DAILY_EXPENSE_CATEGORIES.map((category): RecordEditField => ({
      name: `expense_${category.key}`,
      label: category.label,
      type: 'number',
      step: '0.01',
      min: '0',
      placeholder: '0.00',
    })),
    { name: 'daily_expenses_notes', label: 'Detalle de gastos', placeholder: 'Peaje, compra, entrada...', fullWidth: true },
    { name: 'visited_places', label: 'Lugares visitados', placeholder: 'Lugar A, Lugar B', fullWidth: true },
    { name: 'tags', label: 'Etiquetas', placeholder: 'naturaleza, recomendado', fullWidth: true },
    { name: 'grey_water_emptied', label: 'Vaciado aguas grises', type: 'checkbox' },
    { name: 'black_water_emptied', label: 'Vaciado aguas negras', type: 'checkbox' },
    { name: 'fresh_water_filled', label: 'Llenado aguas limpias', type: 'checkbox' },
  ]

  async function updateDailyRecord() {
    if (!editingRecord) return
    const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
    const editedBreakdown = DAILY_EXPENSE_CATEGORIES.reduce<DailyExpenseBreakdown>((acc, category) => {
      const amount = Number.parseFloat(String(editingRecord[`expense_${category.key}`] ?? ''))
      if (Number.isFinite(amount) && amount > 0) {
        acc[category.key] = amount
      }
      return acc
    }, {})
    const editedExpensesTotal = sumExpenseBreakdown(editedBreakdown)
    const response = await fetch('/api/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'daily_logs',
        id: editingRecord.id,
        values: {
          date: editingRecord.date,
          status: editingRecord.status,
          location_name: editingRecord.location_name || null,
          notes: editingRecord.notes || null,
          accommodation_cost: editingRecord.accommodation_cost ? parseFloat(editingRecord.accommodation_cost) : null,
          daily_expenses: editedExpensesTotal > 0 ? editedExpensesTotal : null,
          daily_expenses_notes: editingRecord.daily_expenses_notes || null,
          daily_expense_breakdown: editedBreakdown,
          visited_places: splitList(editingRecord.visited_places),
          tags: splitList(editingRecord.tags),
          grey_water_emptied: editingRecord.grey_water_emptied,
          black_water_emptied: editingRecord.black_water_emptied,
          fresh_water_filled: editingRecord.fresh_water_filled,
        },
      }),
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
              <label className="text-headline">Municipio o ubicación manual</label>
              <input 
                type="text" 
                className={styles.bentoInput}
                placeholder="Ej. Fisterra, Área AC de Lugo, Camping..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                disabled={loading}
              />
              {status === 'travel' && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-blue)' }}>
                  {cachedLocation
                    ? `Se usará la última ubicación GPS autorizada: ${formatStoredLocation(cachedLocation)}. Puedes sobrescribirla escribiendo el municipio.`
                    : 'Al guardar se pedirá GPS e intentaremos detectar el municipio. Si no aparece, escribe la ubicación manualmente.'}
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
              <div className={styles.stopsList}>
                {stops.map((stop) => (
                  <div key={stop.key} className={styles.stopCard}>
                    <div className={styles.stopHeader}>
                      <select
                        className={styles.stopTypeSelect}
                        value={stop.type}
                        onChange={(event) => updateStop(stop.key, { type: event.target.value as DailyStop['type'] })}
                        disabled={loading || stop.key === 'start' || stop.key === 'overnight'}
                        aria-label="Tipo de parada"
                      >
                        {Object.entries(stopLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {!['start', 'overnight'].includes(stop.key) && (
                        <button
                          type="button"
                          className={styles.stopRemove}
                          onClick={() => removeStop(stop.key)}
                          disabled={loading}
                          aria-label="Quitar parada"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className={styles.bentoInput}
                      placeholder={
                        stop.type === 'start'
                          ? 'Lugar A: dónde te despiertas o sales'
                          : stop.type === 'overnight'
                            ? 'Lugar C: dónde duermes'
                            : 'Lugar B: visita, compra, mirador...'
                      }
                      value={stop.name}
                      onChange={(event) => updateStop(stop.key, { name: event.target.value })}
                      disabled={loading}
                    />
                    <input
                      type="text"
                      className={styles.bentoInput}
                      placeholder="Nota opcional de esta parada"
                      value={stop.notes ?? ''}
                      onChange={(event) => updateStop(stop.key, { notes: event.target.value })}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
              <button type="button" className={styles.addStopButton} onClick={addVisitStop} disabled={loading}>
                <Plus size={16} />
                Añadir otra parada
              </button>
              <input
                type="text"
                className={styles.bentoInput}
                placeholder="Extra opcional, separado por comas"
                value={visitedPlaces}
                onChange={(e) => setVisitedPlaces(e.target.value)}
                disabled={loading}
              />
              <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                Usa salida, paradas visitadas y pernocta para reconstruir luego el viaje completo.
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
              <div className={styles.expenseHeader}>
                <label className="text-headline">Gastos del día por categoría</label>
                <span>{formatMoney(dailyExpensesTotal)} €</span>
              </div>
              <div className={styles.expenseGrid}>
                {DAILY_EXPENSE_CATEGORIES.map((category) => (
                  <label key={category.key} className={styles.expenseField}>
                    <span>{category.label}</span>
                    <div className={styles.expenseInputWrap}>
                      <span>€</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`${styles.bentoInput} ${hasError('dailyExpenses') ? styles.bentoInputError : ''}`}
                        placeholder="0.00"
                        value={dailyExpenseInputs[category.key]}
                        onChange={(e) => updateDailyExpense(category.key, e.target.value)}
                        onBlur={() => handleInputBlur('dailyExpenses')}
                        disabled={loading}
                      />
                    </div>
                  </label>
                ))}
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
                  {item.stops && item.stops.length > 0 && (
                    <div className={styles.stopsSummary}>
                      {item.stops.map((stop, index) => (
                        <span key={`${stop.type}-${stop.name}-${index}`}>
                          {stopLabels[stop.type]}: {stop.name}
                          {stop.notes ? ` · ${stop.notes}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {(!item.stops || item.stops.length === 0) && item.visited_places && item.visited_places.length > 0 && (
                    <span className={styles.recordNote}>Visitado: {item.visited_places.join(', ')}</span>
                  )}
                  {item.notes && <span className={styles.recordNote}>{item.notes}</span>}
                  {(item.accommodation_cost || item.daily_expenses) && (
                    <span className={styles.recordNote}>
                      Gastos: {[
                        item.accommodation_cost ? `alojamiento ${formatMoney(Number(item.accommodation_cost))} €` : null,
                        ...formatExpenseBreakdown(normalizeExpenseBreakdown(item.daily_expense_breakdown))
                          .map((expense) => `${expense.label.toLowerCase()} ${formatMoney(expense.amount)} €`),
                        !formatExpenseBreakdown(normalizeExpenseBreakdown(item.daily_expense_breakdown)).length && item.daily_expenses
                          ? `día ${formatMoney(Number(item.daily_expenses))} €`
                          : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className={styles.tagList}>
                      {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  )}
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => setEditingRecord({
                        id: item.id,
                        date: item.date.slice(0, 10),
                        status: item.status,
                        location_name: item.location_name ?? '',
                        notes: item.notes ?? '',
                        accommodation_cost: item.accommodation_cost ? String(item.accommodation_cost) : '',
                        daily_expenses_notes: item.daily_expenses_notes ?? '',
                        visited_places: item.visited_places?.join(', ') ?? '',
                        tags: item.tags?.join(', ') ?? '',
                        grey_water_emptied: item.grey_water_emptied,
                        black_water_emptied: item.black_water_emptied,
                        fresh_water_filled: item.fresh_water_filled,
                        ...Object.fromEntries(
                          DAILY_EXPENSE_CATEGORIES.map((category) => [
                            `expense_${category.key}`,
                            breakdownToExpenseInputs(item.daily_expense_breakdown)[category.key],
                          ])
                        ),
                      })}
                    >
                      Editar
                    </button>
                    <button type="button" onClick={() => setDeletingRecordId(item.id)}>Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <RecordEditDialog
        open={Boolean(editingRecord)}
        title="Editar registro diario"
        description="Corrige estado, fecha, ubicación, notas, gastos, lugares visitados, etiquetas o depósitos."
        fields={dailyEditFields}
        values={editingRecord ?? {}}
        onChange={(name, value) => setEditingRecord((current) => current ? { ...current, [name]: value } : current)}
        onCancel={() => setEditingRecord(null)}
        onConfirm={() => void updateDailyRecord()}
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
