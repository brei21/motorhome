'use client'

import { useEffect, useState } from 'react'
import { Car, FileText, Loader2, ShieldCheck } from 'lucide-react'
import styles from '../settings/settings.module.css'

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

function daysUntil(value?: string | null) {
  if (!value) return null
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function alertText(label: string, date?: string | null) {
  const days = daysUntil(date)
  if (days === null) return `${label}: sin fecha`
  if (days < 0) return `${label}: vencido hace ${Math.abs(days)} días`
  if (days === 0) return `${label}: vence hoy`
  return `${label}: vence en ${days} días`
}

export default function VehiclePage() {
  const [vehicle, setVehicle] = useState<VehicleProfile>({})
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [documentForm, setDocumentForm] = useState(emptyDocument)
  const [loading, setLoading] = useState(true)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVehicle() {
      try {
        const response = await fetch('/api/vehicle')
        const payload = await response.json()
        setVehicle(payload.profile ?? {})
        setDocuments(Array.isArray(payload.documents) ? payload.documents : [])
      } catch {
        setError('No se pudo cargar la ficha del vehículo.')
      } finally {
        setLoading(false)
      }
    }

    void loadVehicle()
  }, [])

  function updateVehicle(key: keyof VehicleProfile, value: string) {
    setVehicle((current) => ({ ...current, [key]: key === 'year' ? (value ? Number(value) : null) : value }))
  }

  function updateDocument(key: keyof typeof emptyDocument, value: string) {
    setDocumentForm((current) => ({ ...current, [key]: value }))
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
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar.')
      setVehicle(payload.profile ?? vehicle)
      setMessage('Ficha del vehículo guardada.')
    } catch {
      setError('No se pudo guardar la ficha del vehículo.')
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
        body: JSON.stringify({ ...documentForm, kind: 'document' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar.')
      setDocuments((current) => [payload.document, ...current])
      setDocumentForm(emptyDocument)
      setMessage('Documento guardado.')
    } catch {
      setError('No se pudo guardar el documento.')
    } finally {
      setDocumentLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Vehículo</p>
        <h1>Ficha técnica y alertas.</h1>
        <p>Datos críticos de la autocaravana, documentación y vencimientos visibles antes de salir.</p>
      </header>

      {message && <div className={styles.successBanner}>{message}</div>}
      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.cardGrid}>
        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}><ShieldCheck size={18} /></div>
            <div>
              <h2 className={styles.cardTitle}>Alertas reales</h2>
              <p className={styles.cardText}>ITV, seguro y documentos se reflejan también en el dashboard.</p>
            </div>
          </div>
          {loading ? (
            <p className={styles.cardText}>Cargando alertas...</p>
          ) : (
            <div className={styles.documentList}>
              <article className={styles.documentItem}><strong>{alertText('ITV', vehicle.inspection_due_date)}</strong><span>Ficha del vehículo</span></article>
              <article className={styles.documentItem}><strong>{alertText('Seguro', vehicle.insurance_due_date)}</strong><span>Ficha del vehículo</span></article>
              {documents.filter((document) => document.expires_at).map((document) => (
                <article key={document.id} className={styles.documentItem}>
                  <strong>{alertText(document.title, document.expires_at)}</strong>
                  <span>{document.type}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrap}><Car size={18} /></div>
            <div>
              <h2 className={styles.cardTitle}>Ficha técnica</h2>
              <p className={styles.cardText}>Matrícula, modelo, neumáticos, aceite, batería, gas y medidas.</p>
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
            <div className={styles.iconWrap}><FileText size={18} /></div>
            <div>
              <h2 className={styles.cardTitle}>Documentos y referencias</h2>
              <p className={styles.cardText}>No subimos archivos: guarda URL, referencia o nota para no consumir Railway.</p>
            </div>
          </div>

          <form className={styles.documentGrid} onSubmit={handleDocumentSave}>
            <label className={styles.label}>Título<input className={styles.input} value={documentForm.title} onChange={(event) => updateDocument('title', event.target.value)} required /></label>
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
              <p className={styles.cardText}>Aún no hay documentos guardados.</p>
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
      </section>
    </div>
  )
}
