'use client'

import { useState } from 'react'
import { createDailyRecord, DailyRecordStatus } from '@/app/actions/daily-records'
import { Loader2, CheckCircle2, Navigation, MapPin, Home } from 'lucide-react'
import styles from './page.module.css'

export default function DailyPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState<DailyRecordStatus>('travel')
  const [locationName, setLocationName] = useState('')
  const [notes, setNotes] = useState('')
  const [accommodationCost, setAccommodationCost] = useState('')
  const [greyWater, setGreyWater] = useState(false)
  const [blackWater, setBlackWater] = useState(false)
  const [freshWater, setFreshWater] = useState(false)

  const requestGeolocation = (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    try {
      let coords = null
      if (status === 'travel') {
        coords = await requestGeolocation()
      }

      const isoDate = new Date().toISOString().split('T')[0]
      await createDailyRecord({
        date: isoDate,
        status,
        latitude: coords?.lat,
        longitude: coords?.lng,
        location_name: locationName || null,
        notes: notes || null,
        accommodation_cost: accommodationCost ? parseFloat(accommodationCost) : null,
        grey_water_emptied: greyWater,
        black_water_emptied: blackWater,
        fresh_water_filled: freshWater
      })
      
      setSuccess(true)
      setLocationName('')
      setNotes('')
      setAccommodationCost('')
      setGreyWater(false)
      setBlackWater(false)
      setFreshWater(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
      alert('Error guardando el registro diario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Registro Diario</h1>
      </header>

      <div className={styles.bentoSplit}>
        {/* Left Form: White Bento Box */}
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 color="var(--accent-green)" />
              <span className="text-headline">Guardado hoy correctamente</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.statusGrid}>
              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'travel' ? styles.statusActiveTravel : ''}`}
                onClick={() => setStatus('travel')}
              >
                <div className={styles.statusIcon}><Navigation size={24} /></div>
                <span className="text-headline">De Viaje</span>
              </button>

              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'parking' ? styles.statusActiveParking : ''}`}
                onClick={() => setStatus('parking')}
              >
                <div className={styles.statusIcon}><MapPin size={24} /></div>
                <span className="text-headline">En Parking</span>
              </button>

              <button 
                type="button" 
                className={`${styles.statusBtn} ${status === 'vacation_home' ? styles.statusActiveHome : ''}`}
                onClick={() => setStatus('vacation_home')}
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
                placeholder="Ej. Camping Les Medes, Parcela 4"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                disabled={loading}
              />
              {status === 'travel' && (
                <p className="text-subhead" style={{ marginTop: 8, color: 'var(--accent-blue)' }}>
                  Aviso: Se te pedirá el permiso de GPS del navegador.
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Bitácora del Día (Notas)</label>
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
              <label className="text-headline">Gasto de Alojamiento (Opcional)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, fontSize: 16, color: 'var(--text-secondary)', zIndex: 2, fontWeight: 600 }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.bentoInput}
                  placeholder="0.00  (Camping, parking de pago...)"
                  value={accommodationCost}
                  onChange={(e) => setAccommodationCost(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <span className="text-headline" style={{ marginBottom: 16, display: 'block' }}>Depósitos de Agua</span>
              
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span className="text-body">Vaciado Aguas Grises</span>
                <input 
                  type="checkbox" 
                  style={{ width: '24px', height: '24px', accentColor: 'var(--bento-dark)', cursor: 'pointer' }}
                  checked={greyWater} 
                  onChange={(e) => setGreyWater(e.target.checked)}
                  disabled={loading}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span className="text-body">Vaciado Aguas Negras</span>
                <input 
                  type="checkbox" 
                  style={{ width: '24px', height: '24px', accentColor: 'var(--bento-dark)', cursor: 'pointer' }}
                  checked={blackWater} 
                  onChange={(e) => setBlackWater(e.target.checked)}
                  disabled={loading}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
                <span className="text-body" style={{ color: 'var(--accent-blue)' }}>Llenado Aguas Limpias</span>
                <input 
                  type="checkbox" 
                  style={{ width: '24px', height: '24px', accentColor: 'var(--bento-dark)', cursor: 'pointer' }}
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
              style={{ background: status === 'travel' ? 'var(--bento-green)' : status === 'parking' ? 'var(--bento-yellow)' : 'var(--bento-purple)', color: status === 'parking' ? 'black' : 'white' }}
            >
              {loading && !success ? <Loader2 className="spinning" size={24} /> : 'Guardar Estado'}
            </button>
          </form>
        </section>

        {/* Right List: Dark Bento Box (Like Packing List) */}
        <section className={`bento-card-dark animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.listHeader}>
            <span className="text-headline">ÚLTIMOS REGISTROS</span>
          </div>

          <div className={styles.recordList}>
             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-green)' }}><Navigation size={14} color="white" /></div>
                <div className={styles.recordDetails}>
                  <span className="text-body">De Viaje</span>
                  <span className="text-subhead">Ayer, Pirineos</span>
                </div>
             </div>
             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-green)' }}><Navigation size={14} color="white" /></div>
                <div className={styles.recordDetails}>
                  <span className="text-body">De Viaje</span>
                  <span className="text-subhead">Hace 2 días, Huesca</span>
                </div>
             </div>
             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-yellow)' }}><MapPin size={14} color="black" /></div>
                <div className={styles.recordDetails}>
                  <span className="text-body">En Parking</span>
                  <span className="text-subhead">Hace 3 días</span>
                </div>
             </div>
             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-purple)' }}><Home size={14} color="white" /></div>
                <div className={styles.recordDetails}>
                  <span className="text-body">En Casa</span>
                  <span className="text-subhead">Hace 1 semana</span>
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  )
}
