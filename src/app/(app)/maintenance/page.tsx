'use client'

import { useState } from 'react'
import { createMaintenanceRecord, MaintenanceType } from '@/app/actions/maintenance-records'
import { Loader2, CheckCircle2, Wrench, ArrowUpCircle, ShieldCheck, Euro, PenTool } from 'lucide-react'
import styles from './page.module.css'

export default function MaintenancePage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [type, setType] = useState<MaintenanceType>('maintenance')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    try {
      const isoDate = new Date().toISOString().split('T')[0]
      await createMaintenanceRecord({
        date: isoDate,
        type,
        description,
        cost: cost ? parseFloat(cost) : null
      })
      
      setSuccess(true)
      setDescription('')
      setCost('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
      alert('Error guardando el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Taller & Tareas</h1>
      </header>

      <div className={styles.bentoSplit}>
        {/* Left Form: Bento Box */}
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s' }}>
          
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 color="var(--accent-green)" />
              <span className="text-headline">Registro guardado</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            
            <div className={styles.typeGrid}>
              <button 
                type="button" 
                className={`${styles.typeBtn} ${type === 'maintenance' ? styles.typeActiveBlue : ''}`}
                onClick={() => setType('maintenance')}
              >
                <ShieldCheck size={24} />
                <span className="text-body" style={{ marginTop: 8 }}>Revisión</span>
              </button>

              <button 
                type="button" 
                className={`${styles.typeBtn} ${type === 'improvement' ? styles.typeActiveGreen : ''}`}
                onClick={() => setType('improvement')}
              >
                <ArrowUpCircle size={24} />
                <span className="text-body" style={{ marginTop: 8 }}>Mejora</span>
              </button>

              <button 
                type="button" 
                className={`${styles.typeBtn} ${type === 'repair' ? styles.typeActiveRed : ''}`}
                onClick={() => setType('repair')}
              >
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
                  placeholder="Ej. Cambio de Aceite y Filtros"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Coste Total (Opcional)</label>
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

            <button 
              type="submit" 
              className={`${styles.submitButton} interactive-element`}
              disabled={loading || !description}
            >
              {loading && !success ? <Loader2 className="spinning" size={24} /> : 'Guardar en Historial'}
            </button>
          </form>
        </section>

        {/* Right List: Dark Bento Box (Packing List style) */}
        <section className={`bento-card-dark animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s', background: 'var(--bento-dark)' }}>
          <div className={styles.listHeader}>
            <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18}/> HISTORIAL TALLER</span>
          </div>

          <div className={styles.todoList}>
             <label className={styles.todoItem}>
               <div className={styles.todoIcon} style={{ background: 'rgba(52, 199, 89, 0.15)', color: 'var(--accent-green)' }}><ArrowUpCircle size={16}/></div>
               <div className={styles.todoTexts}>
                 <span className="text-body">Placa Solar 200W</span>
                 <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.5)' }}>Mejora • 520€</span>
               </div>
             </label>
             <label className={styles.todoItem}>
               <div className={styles.todoIcon} style={{ background: 'rgba(0, 122, 255, 0.15)', color: 'var(--accent-blue)' }}><ShieldCheck size={16}/></div>
               <div className={styles.todoTexts}>
                 <span className="text-body">Cambio Aceite</span>
                 <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.5)' }}>Revisión • 120€</span>
               </div>
             </label>
             <label className={styles.todoItem}>
               <div className={styles.todoIcon} style={{ background: 'rgba(255, 59, 48, 0.15)', color: 'var(--accent-red)' }}><Wrench size={16}/></div>
               <div className={styles.todoTexts}>
                 <span className="text-body">Bomba de Agua</span>
                 <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.5)' }}>Avería • 85€</span>
               </div>
             </label>
          </div>
        </section>
      </div>
    </div>
  )
}
