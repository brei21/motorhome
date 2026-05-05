'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import styles from './page.module.css'

type FavoritePlace = {
  id: string
  name: string
  type: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
}

const typeOptions = [
  ['camping', 'Camping'],
  ['parking', 'Parking'],
  ['motorhome_area', 'Área AC'],
  ['viewpoint', 'Mirador'],
  ['workshop', 'Taller'],
  ['fuel', 'Gasolinera'],
  ['lpg', 'GLP'],
  ['water', 'Agua/servicios'],
  ['restaurant', 'Restaurante'],
  ['supermarket', 'Supermercado'],
  ['other', 'Otro'],
]

const emptyForm = { name: '', type: 'motorhome_area', latitude: '', longitude: '', notes: '' }

export default function FavoritesPage() {
  const [places, setPlaces] = useState<FavoritePlace[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function loadPlaces() {
    setLoading(true)
    const response = await fetch('/api/favorite-places')
    const payload = await response.json()
    setPlaces(Array.isArray(payload) ? payload : [])
    setLoading(false)
  }

  useEffect(() => {
    void loadPlaces()
  }, [])

  function updateForm(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function savePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await fetch('/api/favorite-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          notes: form.notes || null,
        }),
      })
      setForm(emptyForm)
      setMessage('Favorito guardado.')
      await loadPlaces()
    } finally {
      setSaving(false)
    }
  }

  async function deletePlace(id: string) {
    await fetch('/api/favorite-places', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadPlaces()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Favoritos</p>
        <h1>Lugares útiles para volver.</h1>
        <p>Campings, parkings, áreas AC, miradores, talleres, gasolineras, GLP y servicios.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div>
            <p className={styles.cardMeta}>Nuevo favorito</p>
            <h2>Guardar lugar</h2>
          </div>
          {message && <div className={styles.message}>{message}</div>}
          <form className={styles.form} onSubmit={savePlace}>
            <label className={styles.label}>Nombre<input className={styles.input} value={form.name} onChange={(event) => updateForm('name', event.target.value)} required /></label>
            <label className={styles.label}>Tipo
              <select className={styles.input} value={form.type} onChange={(event) => updateForm('type', event.target.value)}>
                {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className={styles.row}>
              <label className={styles.label}>Latitud<input className={styles.input} type="number" step="any" value={form.latitude} onChange={(event) => updateForm('latitude', event.target.value)} /></label>
              <label className={styles.label}>Longitud<input className={styles.input} type="number" step="any" value={form.longitude} onChange={(event) => updateForm('longitude', event.target.value)} /></label>
            </div>
            <label className={styles.label}>Notas<textarea className={styles.input} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} /></label>
            <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar favorito'}</button>
          </form>
        </section>

        <section className={styles.card}>
          <div>
            <p className={styles.cardMeta}>Lista</p>
            <h2>{loading ? 'Cargando...' : `${places.length} favoritos`}</h2>
          </div>
          <div className={styles.list}>
            {loading ? <div className={styles.empty}><Loader2 size={18} className="spinning" /> Cargando favoritos...</div> : places.length === 0 ? (
              <div className={styles.empty}>Todavía no hay favoritos. Guarda los sitios que merecen volver.</div>
            ) : places.map((place) => (
              <article key={place.id} className={styles.placeItem}>
                <div className={styles.placeText}>
                  <strong>{place.name}</strong>
                  <span>{typeOptions.find(([value]) => value === place.type)?.[1] ?? place.type}{place.latitude && place.longitude ? ` · ${place.latitude}, ${place.longitude}` : ''}</span>
                  {place.notes && <span>{place.notes}</span>}
                </div>
                <button className={styles.deleteButton} type="button" onClick={() => void deletePlace(place.id)}>Borrar</button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
