'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createMaintenanceRecord, MaintenanceType } from '@/app/actions/maintenance-records'
import { ArrowUpCircle, CheckCircle2, Loader2, PenTool, ShieldCheck, Wrench, Gauge, Euro } from 'lucide-react'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './page.module.css'

interface MaintenanceLog {
  id: string
  date: string
  type: MaintenanceType
  description: string
  cost: number | null
  odometer_at: number | null
  due_odometer: number | null
  due_date: string | null
}

const typeTitle: Record<MaintenanceType, string> = {
  maintenance: 'Revisión',
  improvement: 'Mejora',
  repair: 'Avería',
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function MaintenancePage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [type, setType] = useState<MaintenanceType>('maintenance')
  const [recordDate, setRecordDate] = useState(todayIso)
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [odometerAt, setOdometerAt] = useState('')
  const [dueOdometer, setDueOdometer] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [records, setRecords] = useState<MaintenanceLog[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingMaintenance, setEditingMaintenance] = useState<{ id: string; description: string } | null>(null)
  const [deletingMaintenanceId, setDeletingMaintenanceId] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const [maintenanceResponse, odometerResponse] = await Promise.all([
        fetch('/api/maintenance-logs'),
        fetch('/api/odometer'),
      ])
      const maintenancePayload = (await maintenanceResponse.json()) as MaintenanceLog[]
      const odometerPayload = (await odometerResponse.json()) as { value: number }
      setRecords(maintenancePayload)
      setOdometerAt((previous) => previous || String(odometerPayload.value || ''))
    } catch (error) {
      console.error('No se pudo cargar el historial del taller', error)
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)
    try {
      await createMaintenanceRecord({
        date: recordDate,
        type,
        description,
        cost: cost ? parseFloat(cost) : null,
        odometer_at: odometerAt ? parseInt(odometerAt, 10) : null,
        due_odometer: dueOdometer ? parseInt(dueOdometer, 10) : null,
        due_date: dueDate || null,
      })
      setSuccess(true)
      setRecordDate(todayIso())
      setDescription('')
      setCost('')
      setDueOdometer('')
      setDueDate('')
      await loadRecords()
      setTimeout(() => setSuccess(false), 2600)
    } catch (error) {
      console.error(error)
      setError('Error guardando el registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const iconByType: Record<MaintenanceType, ReactNode> = {
    maintenance: <ShieldCheck size={16} />,
    improvement: <ArrowUpCircle size={16} />,
    repair: <Wrench size={16} />,
  }

  async function updateMaintenanceDescription() {
    if (!editingMaintenance?.description.trim()) return
    const response = await fetch('/api/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'maintenance_logs', id: editingMaintenance.id, values: { description: editingMaintenance.description } }),
    })
    if (!response.ok) {
      setError('No se pudo actualizar el registro de taller. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setEditingMaintenance(null)
    await loadRecords()
  }

  async function deleteMaintenanceRecord() {
    if (!deletingMaintenanceId) return
    const response = await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'maintenance_logs', id: deletingMaintenanceId }),
    })
    if (!response.ok) {
      setError('No se pudo borrar el registro de taller. Revisa la conexión e inténtalo de nuevo.')
      return
    }
    setDeletingMaintenanceId(null)
    await loadRecords()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Taller & Tareas</h1>
      </header>

      <div className={styles.bentoSplit}>
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 size={18} />
              <span className="text-headline">Registro guardado</span>
            </div>
          )}
          {error && (
            <div className={`${styles.errorBanner} animate-fade-in`}>
              <span className="text-headline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <label className="text-headline">Fecha del registro</label>
              <input
                type="date"
                className={styles.bentoInput}
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className={styles.typeGrid}>
              <button type="button" className={`${styles.typeBtn} ${type === 'maintenance' ? styles.typeActiveBlue : ''}`} onClick={() => setType('maintenance')}>
                <ShieldCheck size={24} />
                <span className="text-body" style={{ marginTop: 8 }}>Revisión</span>
              </button>
              <button type="button" className={`${styles.typeBtn} ${type === 'improvement' ? styles.typeActiveGreen : ''}`} onClick={() => setType('improvement')}>
                <ArrowUpCircle size={24} />
                <span className="text-body" style={{ marginTop: 8 }}>Mejora</span>
              </button>
              <button type="button" className={`${styles.typeBtn} ${type === 'repair' ? styles.typeActiveRed : ''}`} onClick={() => setType('repair')}>
                <Wrench size={24} />
                <span className="text-body" style={{ marginTop: 8 }}>Avería</span>
              </button>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Descripción de la tarea</label>
              <div className={styles.inputWrapper}>
                <PenTool className={styles.inputIcon} size={20} />
                <input
                  type="text"
                  className={`${styles.bentoInput} ${styles.withIcon}`}
                  placeholder="Describe la tarea realizada"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className="text-headline">Coste total (opcional)</label>
                <div className={styles.inputWrapper}>
                  <Euro className={styles.inputIcon} size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`${styles.bentoInput} ${styles.withIcon}`}
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className="text-headline">Odómetro vehículo</label>
                <div className={styles.inputWrapper}>
                  <Gauge className={styles.inputIcon} size={20} />
                  <input
                    type="number"
                    min="0"
                    className={`${styles.bentoInput} ${styles.withIcon}`}
                    placeholder="Km del vehiculo"
                    value={odometerAt}
                    onChange={(e) => setOdometerAt(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className="text-headline">Próximo aviso por km</label>
                <div className={styles.inputWrapper}>
                  <Gauge className={styles.inputIcon} size={20} />
                  <input
                    type="number"
                    min="0"
                    className={`${styles.bentoInput} ${styles.withIcon}`}
                    placeholder="Ej. 30000"
                    value={dueOdometer}
                    onChange={(e) => setDueOdometer(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className="text-headline">Próximo aviso por fecha</label>
                <input
                  type="date"
                  className={styles.bentoInput}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className={`${styles.submitButton} interactive-element`} disabled={loading || !description}>
              {loading ? <Loader2 className="spinning" size={20} /> : 'Guardar en historial'}
            </button>
          </form>
        </section>

        <section className={`bento-card animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.listHeader}>
            <span className="text-headline">Bitácora Taller</span>
            <span className="text-subhead">{recordsLoading ? 'Cargando...' : `${records.length} registros`}</span>
          </div>

          <div className={styles.todoList}>
            {recordsLoading && (
              <div className={styles.emptyState}>
                <Loader2 size={16} className="spinning" />
                <span className="text-subhead">Cargando historial...</span>
              </div>
            )}
            {!recordsLoading && records.length === 0 && (
              <div className={styles.emptyState}>
                <ShieldCheck size={16} />
                <span className="text-subhead">Aún no hay registros de taller.</span>
              </div>
            )}

            {!recordsLoading &&
              records.map((record) => (
                <article key={record.id} className={styles.todoItem}>
                  <div className={styles.todoIcon}>{iconByType[record.type]}</div>
                  <div className={styles.todoTexts}>
                    <span className="text-body">{record.description}</span>
                    <span className="text-subhead">
                      {typeTitle[record.type]} · {record.cost ? `${record.cost.toFixed(2)} €` : 'sin coste'} · {record.odometer_at ? `${record.odometer_at} km` : 'sin km'}
                    </span>
                    {(record.due_odometer || record.due_date) && (
                      <span className="text-subhead">
                        Aviso: {record.due_odometer ? `${record.due_odometer} km` : ''}{record.due_odometer && record.due_date ? ' · ' : ''}{record.due_date || ''}
                      </span>
                    )}
                    <div className={styles.itemActions}>
                      <button type="button" onClick={() => setEditingMaintenance({ id: record.id, description: record.description })}>Editar</button>
                      <button type="button" onClick={() => setDeletingMaintenanceId(record.id)}>Borrar</button>
                    </div>
                  </div>
                  <span className="text-subhead">{record.date.slice(0, 10)}</span>
                </article>
              ))}
          </div>
        </section>
      </div>
      <ActionDialog
        open={Boolean(editingMaintenance)}
        title="Editar registro de taller"
        description="Actualiza la descripción del registro sin cambiar costes, fecha ni odómetro."
        inputLabel="Descripción"
        inputValue={editingMaintenance?.description ?? ''}
        inputPlaceholder="Describe la tarea"
        confirmLabel="Guardar cambios"
        onInputChange={(value) => setEditingMaintenance((current) => current ? { ...current, description: value } : current)}
        onCancel={() => setEditingMaintenance(null)}
        onConfirm={() => void updateMaintenanceDescription()}
      />
      <ActionDialog
        open={Boolean(deletingMaintenanceId)}
        title="Borrar registro de taller"
        description="Esta acción elimina el registro permanentemente y recalculará el histórico."
        confirmLabel="Borrar registro"
        tone="danger"
        requiredText="BORRAR"
        onCancel={() => setDeletingMaintenanceId(null)}
        onConfirm={() => void deleteMaintenanceRecord()}
      />
    </div>
  )
}
