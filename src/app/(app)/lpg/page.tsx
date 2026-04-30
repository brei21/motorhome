'use client'

import { useEffect, useMemo, useState } from 'react'
import { createLpgRecord, type LpgRecord, type LpgUnit, type LpgUsageType } from '@/app/actions/lpg-records'
import { AlertCircle, CheckCircle2, Euro, Flame, Loader2, MapPin } from 'lucide-react'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './page.module.css'

interface FieldErrors {
  amount?: string
  pricePerUnit?: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`

const usageLabels: Record<LpgUsageType, string> = {
  cooking: 'Cocina',
  heating: 'Calefacción',
  mixed: 'Mixto',
  other: 'Otro',
}

export default function LpgPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [recordDate, setRecordDate] = useState(todayIso)
  const [amount, setAmount] = useState('')
  const [pricePerUnitInput, setPricePerUnitInput] = useState('')
  const [unit, setUnit] = useState<LpgUnit>('liters')
  const [placeName, setPlaceName] = useState('')
  const [usageType, setUsageType] = useState<LpgUsageType>('mixed')
  const [notes, setNotes] = useState('')
  const [records, setRecords] = useState<LpgRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [editingLpg, setEditingLpg] = useState<{ id: string; place: string } | null>(null)
  const [deletingLpgId, setDeletingLpgId] = useState<string | null>(null)

  const loadRecords = async () => {
    setRecordsLoading(true)
    try {
      const response = await fetch('/api/lpg-logs')
      const payload = (await response.json()) as LpgRecord[]
      setRecords(payload)
    } catch (fetchError) {
      console.error('No se pudieron cargar los registros GLP', fetchError)
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
      return field === 'amount' ? 'El importe es obligatorio' : 'El precio por unidad es obligatorio'
    }
    if (Number.isNaN(numeric) || numeric <= 0) return 'Introduce un valor mayor que 0'
    if (field === 'amount' && numeric > 500) return 'Importe demasiado alto, revisa el valor'
    if (field === 'pricePerUnit' && numeric > 20) return 'Precio por unidad demasiado alto, revisa el valor'
    return undefined
  }

  const hasError = (field: keyof FieldErrors) => touched[field] && errors[field]

  const estimatedQuantity = amount && pricePerUnitInput && parseFloat(pricePerUnitInput) > 0
    ? parseFloat(amount) / parseFloat(pricePerUnitInput)
    : 0

  const totals = useMemo(() => {
    return records.reduce(
      (acc, record) => ({
        spent: acc.spent + (Number(record.amount) || 0),
        liters: acc.liters + (record.unit === 'liters' ? Number(record.quantity) || 0 : 0),
        kg: acc.kg + (record.unit === 'kg' ? Number(record.quantity) || 0 : 0),
      }),
      { spent: 0, liters: 0, kg: 0 }
    )
  }, [records])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const amountError = validateField('amount', amount)
    const priceError = validateField('pricePerUnit', pricePerUnitInput)
    if (amountError || priceError) {
      setErrors({ amount: amountError, pricePerUnit: priceError })
      setTouched({ amount: true, pricePerUnit: true })
      return
    }

    setLoading(true)
    setSuccess(false)
    try {
      await createLpgRecord({
        date: recordDate,
        amount: parseFloat(amount),
        quantity: estimatedQuantity,
        unit,
        price_per_unit: parseFloat(pricePerUnitInput),
        place_name: placeName || null,
        usage_type: usageType,
        notes: notes || null,
      })
      setRecordDate(todayIso())
      setAmount('')
      setPricePerUnitInput('')
      setUnit('liters')
      setPlaceName('')
      setUsageType('mixed')
      setNotes('')
      setTouched({})
      setErrors({})
      setSuccess(true)
      await loadRecords()
      setTimeout(() => setSuccess(false), 2600)
    } catch (submitError) {
      console.error(submitError)
      setError('Error guardando GLP. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function updateLpgPlace() {
    if (!editingLpg) return
    const response = await fetch('/api/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'lpg_logs', id: editingLpg.id, values: { place_name: editingLpg.place } }),
    })
    if (!response.ok) {
      setError('No se pudo actualizar el registro GLP. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setEditingLpg(null)
    await loadRecords()
  }

  async function deleteLpgRecord() {
    if (!deletingLpgId) return
    const response = await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'lpg_logs', id: deletingLpgId }),
    })
    if (!response.ok) {
      setError('No se pudo borrar el registro GLP. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setDeletingLpgId(null)
    await loadRecords()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">GLP</h1>
      </header>

      <div className={styles.bentoSplit}>
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 size={18} />
              <span className="text-headline">GLP guardado</span>
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
              <span className="text-subhead">Cantidad estimada</span>
              <span className="text-title-2">{estimatedQuantity ? estimatedQuantity.toFixed(2) : '—'} <span className="text-body">{unit === 'liters' ? 'L' : 'kg'}</span></span>
            </div>
            <div className={styles.statBox}>
              <span className="text-subhead">Total GLP</span>
              <span className="text-title-2">{formatMoney(totals.spent)}</span>
            </div>
            <div className={styles.statBox}>
              <span className="text-subhead">Consumo registrado</span>
              <span className="text-title-2">{totals.liters.toFixed(1)} L · {totals.kg.toFixed(1)} kg</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <label className="text-headline">Fecha del GLP</label>
              <input type="date" className={styles.bentoInput} value={recordDate} onChange={(event) => setRecordDate(event.target.value)} disabled={loading} required />
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className="text-headline">Importe</label>
                <div className={styles.inputWrapper}>
                  <Euro className={styles.inputIcon} size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`${styles.bentoInput} ${styles.withIcon} ${hasError('amount') ? styles.bentoInputError : ''}`}
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, amount: true }))
                      setErrors((current) => ({ ...current, amount: validateField('amount', amount) }))
                    }}
                    disabled={loading}
                    required
                  />
                </div>
                {hasError('amount') && <span className={styles.errorText}>{errors.amount}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label className="text-headline">Precio por {unit === 'liters' ? 'litro' : 'kg'}</label>
                <div className={styles.inputWrapper}>
                  <Euro className={styles.inputIcon} size={20} />
                  <input
                    type="number"
                    step="0.001"
                    min="0.01"
                    className={`${styles.bentoInput} ${styles.withIcon} ${hasError('pricePerUnit') ? styles.bentoInputError : ''}`}
                    placeholder={unit === 'liters' ? '0.899 €/L' : '2.100 €/kg'}
                    value={pricePerUnitInput}
                    onChange={(event) => setPricePerUnitInput(event.target.value)}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, pricePerUnit: true }))
                      setErrors((current) => ({ ...current, pricePerUnit: validateField('pricePerUnit', pricePerUnitInput) }))
                    }}
                    disabled={loading}
                    required
                  />
                </div>
                {hasError('pricePerUnit') && <span className={styles.errorText}>{errors.pricePerUnit}</span>}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className="text-headline">Unidad</label>
                <select className={styles.bentoInput} value={unit} onChange={(event) => setUnit(event.target.value as LpgUnit)} disabled={loading}>
                  <option value="liters">Litros</option>
                  <option value="kg">Kg</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className="text-headline">Uso</label>
                <select className={styles.bentoInput} value={usageType} onChange={(event) => setUsageType(event.target.value as LpgUsageType)} disabled={loading}>
                  {Object.entries(usageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Lugar</label>
              <div className={styles.inputWrapper}>
                <MapPin className={styles.inputIcon} size={20} />
                <input className={`${styles.bentoInput} ${styles.withIcon}`} placeholder="Ej. Repsol Girona, camping, bombona..." value={placeName} onChange={(event) => setPlaceName(event.target.value)} disabled={loading} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Notas</label>
              <input className={styles.bentoInput} placeholder="Ej. calefacción intensa, bombona cambiada..." value={notes} onChange={(event) => setNotes(event.target.value)} disabled={loading} />
            </div>

            <button type="submit" className={`${styles.submitButton} interactive-element`} disabled={loading}>
              {loading && !success ? <Loader2 className="spinning" size={24} /> : 'Guardar GLP'}
            </button>
          </form>
        </section>

        <section className={`bento-card animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.listHeader}>
            <div>
              <p className="text-headline">Historial GLP</p>
              <p className="text-subhead" style={{ color: 'var(--text-secondary)' }}>
                {recordsLoading ? 'Cargando...' : records.length > 0 ? `${records.length} registros` : 'Sin registros todavía'}
              </p>
            </div>
          </div>

          <div className={styles.recordList}>
            {recordsLoading && <div className={styles.emptyState}><Loader2 size={18} className="spinning" /> Cargando registros...</div>}
            {!recordsLoading && records.length === 0 && <div className={styles.emptyState}><Flame size={18} /> Añade tu primer consumo de GLP.</div>}
            {!recordsLoading && records.map((record) => (
              <article key={record.id} className={styles.recordItem}>
                <div className={styles.recordIcon}><Flame size={18} /></div>
                <div className={styles.recordDetails}>
                  <div className={styles.recordMain}>
                    <strong>{formatMoney(record.amount)}</strong>
                    <span className="text-subhead">{record.date}</span>
                  </div>
                  <div className={styles.recordSub}>
                    <span className="text-subhead">{record.quantity.toFixed(2)} {record.unit === 'liters' ? 'L' : 'kg'} · {usageLabels[record.usage_type]}</span>
                    <span className="text-subhead">
                      {record.price_per_unit ? `${record.price_per_unit.toFixed(3)} €/${record.unit === 'liters' ? 'L' : 'kg'}` : 'sin precio'}
                    </span>
                  </div>
                  <div className={styles.recordSub}>
                    <span className="text-subhead">{record.place_name || 'Sin lugar'}</span>
                  </div>
                  {record.notes && <span className="text-subhead">{record.notes}</span>}
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => setEditingLpg({ id: record.id, place: record.place_name ?? '' })}>Editar lugar</button>
                    <button type="button" onClick={() => setDeletingLpgId(record.id)}>Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <ActionDialog
        open={Boolean(editingLpg)}
        title="Editar lugar GLP"
        description="Actualiza el lugar del registro sin modificar importe ni cantidad."
        inputLabel="Lugar"
        inputValue={editingLpg?.place ?? ''}
        inputPlaceholder="Ej. Repsol Girona"
        confirmLabel="Guardar cambios"
        onInputChange={(value) => setEditingLpg((current) => current ? { ...current, place: value } : current)}
        onCancel={() => setEditingLpg(null)}
        onConfirm={() => void updateLpgPlace()}
      />
      <ActionDialog
        open={Boolean(deletingLpgId)}
        title="Borrar registro GLP"
        description="Esta acción elimina el registro permanentemente y recalculará los totales."
        confirmLabel="Borrar GLP"
        tone="danger"
        requiredText="BORRAR"
        onCancel={() => setDeletingLpgId(null)}
        onConfirm={() => void deleteLpgRecord()}
      />
    </div>
  )
}
