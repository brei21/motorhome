'use client'

import { useEffect, useRef, useState } from 'react'
import { Car, ClipboardList, DatabaseBackup, FileText, FileUp, KeyRound, Loader2, LogOut, RotateCcw, ShieldCheck } from 'lucide-react'
import { ActionDialog } from '@/components/ui/action-dialog'
import styles from './settings.module.css'

interface VehicleProfile {
  nickname?: string | null
  plate?: string | null
  model?: string | null
  year?: number | null
  tire_pressure?: string | null
  tire_size?: string | null
  oil_type?: string | null
  battery_notes?: string | null
  gas_notes?: string | null
  dimensions?: string | null
  insurance_due_date?: string | null
  inspection_due_date?: string | null
  notes?: string | null
}

interface AuditLog {
  id: string
  action: string
  entity: string | null
  created_at: string
}

interface VehicleDocument {
  id: string
  title: string
  type: string
  document_url?: string | null
  expires_at?: string | null
  notes?: string | null
  created_at: string
}

const emptyDocument = {
  title: '',
  type: 'itv',
  document_url: '',
  expires_at: '',
  notes: '',
}

export default function SettingsPage() {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [vehicle, setVehicle] = useState<VehicleProfile>({})
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [documentForm, setDocumentForm] = useState(emptyDocument)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changePinDialogOpen, setChangePinDialogOpen] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [importPin, setImportPin] = useState('')
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetPin, setResetPin] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function loadSettingsData() {
      const [vehicleResponse, auditResponse] = await Promise.all([
        fetch('/api/vehicle'),
        fetch('/api/audit'),
      ])
      const vehiclePayload = await vehicleResponse.json()
      const auditPayload = await auditResponse.json()
      setVehicle(vehiclePayload.profile ?? {})
      setDocuments(Array.isArray(vehiclePayload.documents) ? vehiclePayload.documents : [])
      setAuditLogs(Array.isArray(auditPayload) ? auditPayload : [])
    }

    void loadSettingsData()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setChangePinDialogOpen(true)
  }

  async function confirmChangePin() {
    setLoading(true)
    setMessage(null)
    setError(null)
    setChangePinDialogOpen(false)

    try {
      const response = await fetch('/api/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setError(payload?.error || 'No se pudo actualizar el PIN.')
        return
      }

      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setMessage('PIN actualizado correctamente.')
    } catch {
      setError('No se pudo actualizar el PIN.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  async function handleExport(format: 'json' | 'csv') {
    setDataLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(format === 'csv' ? '/api/backup?format=csv' : '/api/backup')
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `motorhome-backup-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage(`Backup ${format.toUpperCase()} exportado correctamente.`)
    } catch {
      setError('No se pudo exportar el backup.')
    } finally {
      setDataLoading(false)
    }
  }

  async function handleImport(file: File | null) {
    if (!file) return
    setPendingImportFile(file)
    setImportPin('')
  }

  async function confirmImport() {
    if (!pendingImportFile || !importPin) return

    setDataLoading(true)
    setError(null)
    setMessage(null)

    try {
      const payload = { ...JSON.parse(await pendingImportFile.text()), pin: importPin }
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Restore failed')
      setMessage('Backup restaurado. Recarga la app para ver los datos actualizados.')
      setPendingImportFile(null)
      setImportPin('')
    } catch {
      setError('No se pudo restaurar el backup. Revisa que el archivo sea correcto.')
    } finally {
      setDataLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleResetData() {
    setResetPin('')
    setResetDialogOpen(true)
  }

  async function confirmResetData() {
    if (!resetPin) return

    setDataLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET', pin: resetPin }),
      })

      if (!response.ok) throw new Error('Reset failed')
      setMessage('Datos borrados. El PIN se mantiene.')
      setResetDialogOpen(false)
      setResetPin('')
    } catch {
      setError('No se pudieron borrar los datos.')
    } finally {
      setDataLoading(false)
    }
  }

  async function handleVehicleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVehicleLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Vehicle save failed')
      setVehicle(payload.profile ?? vehicle)
      setMessage('Ficha del vehiculo guardada.')
    } catch {
      setError('No se pudo guardar la ficha del vehiculo.')
    } finally {
      setVehicleLoading(false)
    }
  }

  async function handleDocumentSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDocumentLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'document', ...documentForm }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Document save failed')
      setDocuments((current) => [payload.document, ...current])
      setDocumentForm(emptyDocument)
      setMessage('Documento guardado.')
    } catch {
      setError('No se pudo guardar el documento.')
    } finally {
      setDocumentLoading(false)
    }
  }

  function updateVehicle(field: keyof VehicleProfile, value: string) {
    setVehicle((current) => ({
      ...current,
      [field]: field === 'year' ? (value ? Number(value) : null) : value,
    }))
  }

  function updateDocument(field: keyof typeof emptyDocument, value: string) {
    setDocumentForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Seguridad</p>
        <h1 className={styles.title}>Acceso y PIN</h1>
        <p className={styles.description}>Gestiona el PIN de acceso y cierra la sesion actual cuando lo necesites.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Cambiar PIN</h2>
              <p className={styles.cardText}>Usa entre 4 y 8 digitos numericos. El PIN se guarda cifrado.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label}>
              PIN actual
              <input
                className={styles.input}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                required
              />
            </label>

            <label className={styles.label}>
              Nuevo PIN
              <input
                className={styles.input}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                required
              />
            </label>

            <label className={styles.label}>
              Confirmar nuevo PIN
              <input
                className={styles.input}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                required
              />
            </label>

            {message ? <p className={styles.success}>{message}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? <Loader2 size={18} className={styles.spinning} /> : <ShieldCheck size={18} />}
              <span>Guardar nuevo PIN</span>
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <LogOut size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Sesion actual</h2>
              <p className={styles.cardText}>Cierra la sesion de este navegador si vas a dejar de usar la aplicacion.</p>
            </div>
          </div>

          <button className={styles.secondaryButton} type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Loader2 size={18} className={styles.spinning} /> : <LogOut size={18} />}
            <span>Cerrar sesion</span>
          </button>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <DatabaseBackup size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Datos y backup</h2>
              <p className={styles.cardText}>Exporta una copia antes de desplegar o restaura una copia previa si algo falla.</p>
            </div>
          </div>

          <div className={styles.buttonStack}>
            <button className={styles.primaryButton} type="button" onClick={() => void handleExport('json')} disabled={dataLoading}>
              {dataLoading ? <Loader2 size={18} className={styles.spinning} /> : <DatabaseBackup size={18} />}
              <span>Exportar JSON</span>
            </button>

            <button className={styles.secondaryButton} type="button" onClick={() => void handleExport('csv')} disabled={dataLoading}>
              <DatabaseBackup size={18} />
              <span>Exportar CSV</span>
            </button>

            <input
              ref={fileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImport(event.target.files?.[0] ?? null)}
            />
            <button className={styles.secondaryButton} type="button" onClick={() => fileInputRef.current?.click()} disabled={dataLoading}>
              <FileUp size={18} />
              <span>Importar backup</span>
            </button>

            <button className={styles.dangerButton} type="button" onClick={handleResetData} disabled={dataLoading}>
              <RotateCcw size={18} />
              <span>Borrar datos de viaje</span>
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Version y despliegue</h2>
              <p className={styles.cardText}>Railway + PostgreSQL. La sesion se firma con cookie segura y los datos viven en la base conectada por DATABASE_URL.</p>
            </div>
          </div>

          <dl className={styles.metaList}>
            <div><dt>App</dt><dd>Motorhome</dd></div>
            <div><dt>Base de datos</dt><dd>PostgreSQL</dd></div>
            <div><dt>Backup</dt><dd>JSON completo sin PIN</dd></div>
          </dl>
        </section>

        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <Car size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Ficha tecnica del vehiculo</h2>
              <p className={styles.cardText}>Datos que conviene tener a mano antes de salir: ITV, seguro, aceite, neumáticos, batería y gas.</p>
            </div>
          </div>

          <form className={styles.vehicleGrid} onSubmit={handleVehicleSave}>
            <label className={styles.label}>Nombre<input className={styles.input} value={vehicle.nickname ?? ''} onChange={(event) => updateVehicle('nickname', event.target.value)} /></label>
            <label className={styles.label}>Matrícula<input className={styles.input} value={vehicle.plate ?? ''} onChange={(event) => updateVehicle('plate', event.target.value)} /></label>
            <label className={styles.label}>Modelo<input className={styles.input} value={vehicle.model ?? ''} onChange={(event) => updateVehicle('model', event.target.value)} /></label>
            <label className={styles.label}>Año<input className={styles.input} type="number" value={vehicle.year ?? ''} onChange={(event) => updateVehicle('year', event.target.value)} /></label>
            <label className={styles.label}>ITV<input className={styles.input} type="date" value={vehicle.inspection_due_date ?? ''} onChange={(event) => updateVehicle('inspection_due_date', event.target.value)} /></label>
            <label className={styles.label}>Seguro<input className={styles.input} type="date" value={vehicle.insurance_due_date ?? ''} onChange={(event) => updateVehicle('insurance_due_date', event.target.value)} /></label>
            <label className={styles.label}>Neumáticos<input className={styles.input} value={vehicle.tire_size ?? ''} onChange={(event) => updateVehicle('tire_size', event.target.value)} /></label>
            <label className={styles.label}>Presión<input className={styles.input} value={vehicle.tire_pressure ?? ''} onChange={(event) => updateVehicle('tire_pressure', event.target.value)} /></label>
            <label className={styles.label}>Aceite<input className={styles.input} value={vehicle.oil_type ?? ''} onChange={(event) => updateVehicle('oil_type', event.target.value)} /></label>
            <label className={styles.label}>Medidas<input className={styles.input} value={vehicle.dimensions ?? ''} onChange={(event) => updateVehicle('dimensions', event.target.value)} /></label>
            <label className={styles.label}>Batería<input className={styles.input} value={vehicle.battery_notes ?? ''} onChange={(event) => updateVehicle('battery_notes', event.target.value)} /></label>
            <label className={styles.label}>Gas<input className={styles.input} value={vehicle.gas_notes ?? ''} onChange={(event) => updateVehicle('gas_notes', event.target.value)} /></label>
            <label className={`${styles.label} ${styles.cardWide}`}>Notas<textarea className={styles.input} value={vehicle.notes ?? ''} onChange={(event) => updateVehicle('notes', event.target.value)} /></label>
            <button className={styles.primaryButton} type="submit" disabled={vehicleLoading}>
              {vehicleLoading ? <Loader2 size={18} className={styles.spinning} /> : <ShieldCheck size={18} />}
              <span>Guardar ficha</span>
            </button>
          </form>
        </section>

        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <FileText size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Documentos del vehiculo</h2>
              <p className={styles.cardText}>Guarda enlaces o referencias a ITV, seguro, facturas, manuales y justificantes.</p>
            </div>
          </div>

          <form className={styles.documentGrid} onSubmit={handleDocumentSave}>
            <label className={styles.label}>Titulo<input className={styles.input} value={documentForm.title} onChange={(event) => updateDocument('title', event.target.value)} required /></label>
            <label className={styles.label}>Tipo
              <select className={styles.input} value={documentForm.type} onChange={(event) => updateDocument('type', event.target.value)}>
                <option value="itv">ITV</option>
                <option value="insurance">Seguro</option>
                <option value="invoice">Factura</option>
                <option value="manual">Manual</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className={styles.label}>Vence<input className={styles.input} type="date" value={documentForm.expires_at} onChange={(event) => updateDocument('expires_at', event.target.value)} /></label>
            <label className={styles.label}>URL o referencia<input className={styles.input} value={documentForm.document_url} onChange={(event) => updateDocument('document_url', event.target.value)} /></label>
            <label className={`${styles.label} ${styles.cardWide}`}>Notas<textarea className={styles.input} value={documentForm.notes} onChange={(event) => updateDocument('notes', event.target.value)} /></label>
            <button className={styles.primaryButton} type="submit" disabled={documentLoading}>
              {documentLoading ? <Loader2 size={18} className={styles.spinning} /> : <FileText size={18} />}
              <span>Guardar documento</span>
            </button>
          </form>

          <div className={styles.documentList}>
            {documents.length === 0 ? (
              <p className={styles.cardText}>Aun no hay documentos guardados.</p>
            ) : documents.map((document) => (
              <article key={document.id} className={styles.documentItem}>
                <div>
                  <strong>{document.title}</strong>
                  <span>{document.type}{document.expires_at ? ` · vence ${String(document.expires_at).slice(0, 10)}` : ''}</span>
                </div>
                {document.document_url ? <a href={document.document_url} target="_blank" rel="noreferrer">Abrir</a> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}>
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Ultimas acciones criticas</h2>
              <p className={styles.cardText}>Auditoria basica de cambios, backups, restauraciones y cierres de viaje.</p>
            </div>
          </div>
          <div className={styles.auditList}>
            {auditLogs.length === 0 ? (
              <p className={styles.cardText}>Todavia no hay acciones registradas.</p>
            ) : auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className={styles.auditItem}>
                <strong>{log.action}</strong>
                <span>{log.entity ?? 'sistema'} · {new Date(log.created_at).toLocaleString('es-ES')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <ActionDialog
        open={changePinDialogOpen}
        title="Cambiar PIN"
        description="Vas a sustituir el PIN de acceso de esta app. A partir de ahora solo funcionará el nuevo PIN."
        confirmLabel="Cambiar PIN"
        onCancel={() => setChangePinDialogOpen(false)}
        onConfirm={() => void confirmChangePin()}
        loading={loading}
      />
      <ActionDialog
        open={Boolean(pendingImportFile)}
        title="Restaurar backup"
        description="Esto sustituirá viajes, diario, combustible, taller, odómetro, favoritos y ficha del vehículo. El PIN actual no cambia."
        inputLabel="PIN actual"
        inputType="password"
        inputValue={importPin}
        inputPlaceholder="Introduce tu PIN"
        confirmLabel="Restaurar backup"
        tone="danger"
        loading={dataLoading}
        onInputChange={(value) => setImportPin(value.replace(/\D/g, '').slice(0, 8))}
        onCancel={() => {
          setPendingImportFile(null)
          setImportPin('')
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
        onConfirm={() => void confirmImport()}
      />
      <ActionDialog
        open={resetDialogOpen}
        title="Borrar datos de viaje"
        description="Esto borra viajes, diario, combustible, taller, odómetro, favoritos y documentos. El PIN se mantiene."
        inputLabel="PIN actual"
        inputType="password"
        inputValue={resetPin}
        inputPlaceholder="Introduce tu PIN"
        requiredText="RESET"
        confirmLabel="Borrar datos"
        tone="danger"
        loading={dataLoading}
        onInputChange={(value) => setResetPin(value.replace(/\D/g, '').slice(0, 8))}
        onCancel={() => {
          setResetDialogOpen(false)
          setResetPin('')
        }}
        onConfirm={() => void confirmResetData()}
      />
    </div>
  )
}
