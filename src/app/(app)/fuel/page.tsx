'use client'

import { useEffect, useMemo, useState } from 'react'
import { createFuelRecord } from '@/app/actions/fuel-records'
import { AlertCircle, Beaker, CheckCircle2, Euro, Loader2, Zap } from 'lucide-react'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './page.module.css'

interface FieldErrors {
  amount?: string
  pricePerLiter?: string
}

interface FuelLog {
  id: string
  date: string
  amount: number
  price_per_liter: number
  odometer_at: number | null
  station_name: string | null
  full_tank: boolean
}

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} €`

export default function FuelPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [amount, setAmount] = useState('')
  const [pricePerLiter, setPricePerLiter] = useState('')
  const [odometerAt, setOdometerAt] = useState('')
  const [stationName, setStationName] = useState('')
  const [fullTank, setFullTank] = useState(true)
  const [records, setRecords] = useState<FuelLog[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [editingFuel, setEditingFuel] = useState<{ id: string; station: string } | null>(null)
  const [deletingFuelId, setDeletingFuelId] = useState<string | null>(null)

  const loadRecords = async () => {
    setRecordsLoading(true)
    try {
      const response = await fetch('/api/fuel-logs')
      const payload = (await response.json()) as FuelLog[]
      setRecords(payload)
    } catch (fetchError) {
      console.error('No se pudieron cargar los repostajes', fetchError)
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const validateField = (field: keyof FieldErrors, value: string): string | undefined => {
    const numeric = parseFloat(value)
    if (!value || value.trim() === '') {
      return field === 'amount' ? 'El importe es obligatorio' : 'El precio por litro es obligatorio'
    }
    if (Number.isNaN(numeric) || numeric <= 0) {
      return 'Introduce un valor mayor que 0'
    }
    if (field === 'pricePerLiter' && numeric > 5) {
      return 'Precio por litro demasiado alto, revisa el valor'
    }
    if (field === 'amount' && numeric > 500) {
      return 'Importe demasiado alto, revisa el valor'
    }
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const nextErrors: FieldErrors = {}
    const amountError = validateField('amount', amount)
    const priceError = validateField('pricePerLiter', pricePerLiter)
    if (amountError) nextErrors.amount = amountError
    if (priceError) nextErrors.pricePerLiter = priceError

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setTouched({ amount: true, pricePerLiter: true })
      return
    }

    setLoading(true)
    setSuccess(false)
    try {
      await createFuelRecord({
        date: new Date().toISOString().slice(0, 10),
        amount: parseFloat(amount),
        price_per_liter: parseFloat(pricePerLiter),
        odometer_at: odometerAt ? parseInt(odometerAt, 10) : null,
        station_name: stationName || null,
        full_tank: fullTank,
      })
      setAmount('')
      setPricePerLiter('')
      setOdometerAt('')
      setStationName('')
      setFullTank(true)
      setTouched({})
      setErrors({})
      setSuccess(true)
      await loadRecords()
      setTimeout(() => setSuccess(false), 2600)
    } catch (submitError) {
      console.error(submitError)
      setError('Error guardando el repostaje. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const hasError = (field: keyof FieldErrors) => touched[field] && errors[field]
  const liters = amount && pricePerLiter && parseFloat(pricePerLiter) > 0
    ? parseFloat(amount) / parseFloat(pricePerLiter)
    : 0

  const totalSpent = useMemo(
    () => records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0),
    [records]
  )
  const consumption = useMemo(() => {
    const fullTankRecords = records
      .filter((record) => record.full_tank && record.odometer_at && record.price_per_liter > 0)
      .sort((a, b) => Number(a.odometer_at) - Number(b.odometer_at))

    if (fullTankRecords.length < 2) return null

    const latest = fullTankRecords[fullTankRecords.length - 1]
    const previous = fullTankRecords[fullTankRecords.length - 2]
    const km = Number(latest.odometer_at) - Number(previous.odometer_at)
    const latestLiters = latest.amount / latest.price_per_liter

    return km > 0 ? (latestLiters / km) * 100 : null
  }, [records])

  async function updateFuelStation() {
    if (!editingFuel) return
    const response = await fetch('/api/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'fuel_logs', id: editingFuel.id, values: { station_name: editingFuel.station } }),
    })
    if (!response.ok) {
      setError('No se pudo actualizar el repostaje. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setEditingFuel(null)
    await loadRecords()
  }

  async function deleteFuelRecord() {
    if (!deletingFuelId) return
    const response = await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'fuel_logs', id: deletingFuelId }),
    })
    if (!response.ok) {
      setError('No se pudo borrar el repostaje. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setDeletingFuelId(null)
    await loadRecords()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Combustible</h1>
      </header>

      <div className={styles.bentoSplit}>
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 size={18} />
              <span className="text-headline">Repostaje guardado</span>
            </div>
          )}

          {error && (
            <div className={`${styles.errorBanner} animate-fade-in`}>
              <AlertCircle size={18} />
              <span className="text-headline">{error}</span>
            </div>
          )}

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className="text-subhead">Litros estimados</span>
              <span className="text-title-2">
                {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(liters)} <span className="text-body">L</span>
              </span>
            </div>
            <div className={styles.statBox}>
              <span className="text-subhead">Total acumulado</span>
              <span className="text-title-2">{formatMoney(totalSpent)}</span>
            </div>
            <div className={styles.statBox}>
              <span className="text-subhead">Consumo real</span>
              <span className="text-title-2">
                {consumption === null
                  ? '—'
                  : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(consumption)}
                <span className="text-body"> L/100</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <label className="text-headline">Importe total</label>
              <div className={styles.inputWrapper}>
                <Euro className={styles.inputIcon} size={20} />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`${styles.bentoInput} ${styles.withIcon} ${hasError('amount') ? styles.bentoInputError : ''}`}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, amount: true }))
                    const message = validateField('amount', amount)
                    setErrors((prev) => ({ ...prev, amount: message }))
                  }}
                  disabled={loading}
                  required
                />
              </div>
              {hasError('amount') && <p className={styles.errorText}>{errors.amount}</p>}
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Precio por litro</label>
              <div className={styles.inputWrapper}>
                <Zap className={styles.inputIcon} size={20} />
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  className={`${styles.bentoInput} ${styles.withIcon} ${hasError('pricePerLiter') ? styles.bentoInputError : ''}`}
                  placeholder="1.539"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, pricePerLiter: true }))
                    const message = validateField('pricePerLiter', pricePerLiter)
                    setErrors((prev) => ({ ...prev, pricePerLiter: message }))
                  }}
                  disabled={loading}
                  required
                />
              </div>
              {hasError('pricePerLiter') && <p className={styles.errorText}>{errors.pricePerLiter}</p>}
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Odómetro y gasolinera</label>
              <div className={styles.formRow}>
                <input
                  type="number"
                  min="0"
                  className={styles.bentoInput}
                  placeholder="Km del vehículo"
                  value={odometerAt}
                  onChange={(e) => setOdometerAt(e.target.value)}
                  disabled={loading}
                />
                <input
                  type="text"
                  className={styles.bentoInput}
                  placeholder="Gasolinera o ubicación"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
                <span>Depósito lleno para calcular consumo real</span>
              </label>
            </div>

            <button type="submit" className={`${styles.submitButton} interactive-element`} disabled={loading || !amount || !pricePerLiter}>
              {loading ? <Loader2 className="spinning" size={20} /> : 'Guardar repostaje'}
            </button>
          </form>
        </section>

        <section className={`bento-card animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.listHeader}>
            <span className="text-headline">Bitácora de Repostajes</span>
            <span className="text-subhead">
              {recordsLoading ? 'Cargando...' : `${records.length} registros`}
            </span>
          </div>

          <div className={styles.recordList}>
            {recordsLoading && (
              <div className={styles.emptyState}>
                <Loader2 size={16} className="spinning" />
                <span className="text-subhead">Cargando repostajes...</span>
              </div>
            )}

            {!recordsLoading && records.length === 0 && (
              <div className={styles.emptyState}>
                <Beaker size={16} />
                <span className="text-subhead">Aún no hay repostajes guardados.</span>
              </div>
            )}

            {!recordsLoading &&
              records.map((record) => {
                const litersUsed = record.price_per_liter > 0 ? record.amount / record.price_per_liter : 0
                return (
                  <article key={record.id} className={styles.recordItem}>
                    <div className={styles.recordIcon}>
                      <Beaker size={16} />
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.recordMain}>
                        <span className="text-headline">{formatMoney(record.amount)}</span>
                        <span className="text-body">
                          {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(litersUsed)} L
                        </span>
                      </div>
                      <div className={styles.recordSub}>
                        <span className="text-subhead">
                          {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(record.price_per_liter)} €/L
                        </span>
                        <span className="text-subhead">{record.date.slice(0, 10)}</span>
                      </div>
                      <div className={styles.recordSub}>
                        <span className="text-subhead">{record.station_name || 'Sin gasolinera'}</span>
                        <span className="text-subhead">{record.odometer_at ? `${record.odometer_at} km` : record.full_tank ? 'depósito lleno' : 'parcial'}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <button type="button" onClick={() => setEditingFuel({ id: record.id, station: record.station_name ?? '' })}>Editar</button>
                        <button type="button" onClick={() => setDeletingFuelId(record.id)}>Borrar</button>
                      </div>
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      </div>
      <ActionDialog
        open={Boolean(editingFuel)}
        title="Editar gasolinera"
        description="Actualiza la ubicación o nombre de la gasolinera sin modificar el importe ni el odómetro."
        inputLabel="Gasolinera o ubicación"
        inputValue={editingFuel?.station ?? ''}
        inputPlaceholder="Ej. Repsol Girona"
        confirmLabel="Guardar cambios"
        onInputChange={(value) => setEditingFuel((current) => current ? { ...current, station: value } : current)}
        onCancel={() => setEditingFuel(null)}
        onConfirm={() => void updateFuelStation()}
      />
      <ActionDialog
        open={Boolean(deletingFuelId)}
        title="Borrar repostaje"
        description="Esta acción elimina el repostaje permanentemente y recalculará los totales."
        confirmLabel="Borrar repostaje"
        tone="danger"
        requiredText="BORRAR"
        onCancel={() => setDeletingFuelId(null)}
        onConfirm={() => void deleteFuelRecord()}
      />
    </div>
  )
}
