'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CalendarDays, Euro, Flame, Fuel, Loader2, MapPin, Navigation, Plus, Wrench } from 'lucide-react'
import { createDailyRecord } from '@/app/actions/daily-records'
import { formatCoordinates, positionToStoredLocation, resolveMunicipality, saveStoredLocation, type StoredLocation } from '@/lib/client-location'
import { DAILY_EXPENSE_CATEGORIES, type DailyExpenseCategoryKey } from '@/lib/expense-categories'
import styles from './page.module.css'

type QuickMode = 'stop' | 'note' | 'expense'

type LocationState =
  | { status: 'idle'; label: string; stored: StoredLocation | null }
  | { status: 'loading'; label: string; stored: StoredLocation | null }
  | { status: 'ready'; label: string; stored: StoredLocation }
  | { status: 'error'; label: string; stored: StoredLocation | null }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    })
  })
}

const modeCopy: Record<QuickMode, { title: string; place: string; note: string; button: string }> = {
  stop: {
    title: 'Registrar parada',
    place: 'Nombre de la parada',
    note: 'Nota opcional de la parada',
    button: 'Guardar parada',
  },
  note: {
    title: 'Nota rápida',
    place: 'Municipio o ubicación opcional',
    note: 'Qué ha pasado ahora',
    button: 'Guardar nota',
  },
  expense: {
    title: 'Gasto rápido',
    place: 'Lugar del gasto opcional',
    note: 'Concepto: peaje, compra, museo...',
    button: 'Guardar gasto',
  },
}

export function LiveTripConsole({ activeTripId, startLocation }: { activeTripId: string | null; startLocation: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<QuickMode>('stop')
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<DailyExpenseCategoryKey>('supermarket')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationState>({
    status: 'idle',
    label: activeTripId ? 'GPS pendiente. Pulsa actualizar si quieres asociar ubicación exacta.' : 'Inicia un viaje para registrar ubicación.',
    stored: null,
  })

  const copy = modeCopy[mode]
  const canSubmit = useMemo(() => {
    if (!activeTripId || saving) return false
    if (mode === 'expense') return Boolean(amount && parseFloat(amount) > 0)
    if (mode === 'note') return Boolean(note.trim() || place.trim())
    return Boolean(place.trim() || location.stored)
  }, [activeTripId, amount, location.stored, mode, note, place, saving])

  async function captureLocation() {
    if (!activeTripId) return
    setLocation((current) => ({ status: 'loading', label: 'Solicitando GPS a Safari...', stored: current.stored }))
    try {
      const position = await getCurrentPosition()
      const stored = positionToStoredLocation(position)
      const locality = await resolveMunicipality(stored)
      saveStoredLocation({ ...stored, locality })
      const nextStored = { ...stored, locality, capturedAt: new Date().toISOString() }
      setLocation({
        status: 'ready',
        label: locality || formatCoordinates(stored),
        stored: nextStored,
      })
      if (!place.trim() && locality) setPlace(locality)
    } catch {
      setLocation((current) => ({
        status: 'error',
        label: 'No se pudo leer GPS. Puedes guardar usando ubicación manual.',
        stored: current.stored,
      }))
    }
  }

  async function submitQuickRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeTripId) return

    setSaving(true)
    setMessage(null)

    try {
      const stored = location.stored
      const locationName = place.trim() || stored?.locality || (stored ? formatCoordinates(stored) : startLocation || null)
      const cleanNote = note.trim()
      const cleanAmount = amount ? parseFloat(amount) : null
      const category = DAILY_EXPENSE_CATEGORIES.find((item) => item.key === expenseCategory)
      const categoryLabel = category?.label ?? 'Gasto'

      await createDailyRecord({
        trip_id: activeTripId,
        date: todayIso(),
        status: 'travel',
        latitude: stored?.latitude ?? null,
        longitude: stored?.longitude ?? null,
        location_name: locationName,
        notes: mode === 'expense'
          ? cleanNote || `${categoryLabel} registrado desde Viaje en directo.`
          : cleanNote || (mode === 'stop' ? 'Parada rápida registrada desde Viaje en directo.' : null),
        daily_expenses: mode === 'expense' ? cleanAmount : null,
        daily_expenses_notes: mode === 'expense' ? `${categoryLabel}${cleanNote ? `: ${cleanNote}` : ''}` : null,
        daily_expense_breakdown: mode === 'expense' && cleanAmount ? { [expenseCategory]: cleanAmount } : {},
        visited_places: mode === 'stop' && locationName ? [locationName] : [],
        stops: mode === 'stop' && locationName
          ? [{ type: 'visit', name: locationName, notes: cleanNote || null, latitude: stored?.latitude ?? null, longitude: stored?.longitude ?? null }]
          : [],
        tags: mode === 'expense' ? ['gasto rápido'] : mode === 'note' ? ['nota rápida'] : ['parada'],
        photo_urls: [],
      })

      setPlace('')
      setNote('')
      setAmount('')
      setMessage(mode === 'expense' ? 'Gasto guardado en la bitácora.' : mode === 'note' ? 'Nota guardada en la bitácora.' : 'Parada guardada en la bitácora.')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.livePanel}>
      <div className={styles.locationStrip}>
        <MapPin size={18} />
        <div>
          <strong>Ubicación actual</strong>
          <span>{location.label}</span>
        </div>
        <button type="button" onClick={() => void captureLocation()} disabled={!activeTripId || location.status === 'loading'}>
          {location.status === 'loading' ? <Loader2 size={15} className={styles.spinning} /> : <Navigation size={15} />}
          Actualizar GPS
        </button>
      </div>

      <div className={styles.quickGrid}>
        <button type="button" className={mode === 'stop' ? styles.quickActive : ''} onClick={() => setMode('stop')} disabled={!activeTripId}>
          <MapPin size={22} />
          <span>Registrar parada</span>
        </button>
        <button type="button" className={mode === 'note' ? styles.quickActive : ''} onClick={() => setMode('note')} disabled={!activeTripId}>
          <CalendarDays size={22} />
          <span>Nota rápida</span>
        </button>
        <button type="button" className={mode === 'expense' ? styles.quickActive : ''} onClick={() => setMode('expense')} disabled={!activeTripId}>
          <Euro size={22} />
          <span>Gasto</span>
        </button>
        <Link href="/fuel" className={styles.quickLink}><Fuel size={22} /><span>Repostaje</span></Link>
        <Link href="/lpg" className={styles.quickLink}><Flame size={22} /><span>GLP</span></Link>
        <Link href="/maintenance" className={styles.quickLink}><Wrench size={22} /><span>Incidencia</span></Link>
      </div>

      <form className={styles.quickForm} onSubmit={submitQuickRecord}>
        <div className={styles.quickFormHeader}>
          <p className={styles.kicker}>{copy.title}</p>
          {message && <span>{message}</span>}
        </div>
        <div className={styles.quickFields}>
          <label>
            <span>{copy.place}</span>
            <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Ej. Área AC de Llanes" disabled={!activeTripId || saving} />
          </label>
          {mode === 'expense' && (
            <>
              <label>
                <span>Categoría</span>
                <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as DailyExpenseCategoryKey)} disabled={!activeTripId || saving}>
                  {DAILY_EXPENSE_CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Importe</span>
                <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" disabled={!activeTripId || saving} />
              </label>
            </>
          )}
          <label className={styles.fullField}>
            <span>{copy.note}</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota rápida para el diario de a bordo" disabled={!activeTripId || saving} />
          </label>
        </div>
        <button type="submit" className={styles.primary} disabled={!canSubmit}>
          {saving ? <Loader2 size={16} className={styles.spinning} /> : <Plus size={16} />}
          {copy.button}
        </button>
      </form>
    </section>
  )
}
