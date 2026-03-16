'use client'

import { useState } from 'react'
import { createFuelRecord } from '@/app/actions/fuel-records'
import { Loader2, CheckCircle2, Droplets, Euro, Zap, Beaker } from 'lucide-react'
import styles from './page.module.css'

export default function FuelPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [amount, setAmount] = useState('')
  const [pricePerLiter, setPricePerLiter] = useState('')

  const calculatedLiters = amount && pricePerLiter && parseFloat(pricePerLiter) > 0 
    ? (parseFloat(amount) / parseFloat(pricePerLiter)).toFixed(2)
    : '0.00'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amountVal = parseFloat(amount)
    const priceVal = parseFloat(pricePerLiter)
    
    if (isNaN(amountVal) || isNaN(priceVal) || amountVal <= 0 || priceVal <= 0) return

    setLoading(true)
    setSuccess(false)

    try {
      const isoDate = new Date().toISOString().split('T')[0]
      await createFuelRecord({
        date: isoDate,
        amount: amountVal,
        price_per_liter: priceVal
      })
      
      setSuccess(true)
      setAmount('')
      setPricePerLiter('')
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
      alert('Error guardando el repostaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Combustible</h1>
      </header>

      <div className={styles.bentoSplit}>
        {/* Left Form: Bento Box Purple Light */}
        <section className={`bento-card animate-slide-up ${styles.formSection}`} style={{ animationDelay: '0.1s', background: 'var(--bento-purple-light)', color: 'white' }}>
          
          {success && (
            <div className={`${styles.successBanner} animate-fade-in`}>
              <CheckCircle2 color="white" />
              <span className="text-headline">Repostaje guardado</span>
            </div>
          )}

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Litros (Estimado)</span>
              <span className="text-title-2" style={{ color: 'white' }}>{calculatedLiters} <span className="text-body" style={{ color: 'rgba(255,255,255,0.7)' }}>L</span></span>
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
                  className={`${styles.bentoInput} ${styles.withIcon}`}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className="text-headline">Precio por litro</label>
              <div className={styles.inputWrapper}>
                <Zap className={styles.inputIcon} size={20} />
                <input 
                  type="number" 
                  step="0.001"
                  min="0.001"
                  className={`${styles.bentoInput} ${styles.withIcon}`}
                  placeholder="1.539"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={`${styles.submitButton} interactive-element`}
              disabled={loading || !amount || !pricePerLiter}
            >
              {loading && !success ? <Loader2 className="spinning" size={24} /> : 'Guardar Repostaje'}
            </button>
          </form>
        </section>

        {/* Right List: White Bento */}
        <section className={`bento-card animate-slide-up ${styles.listSection}`} style={{ animationDelay: '0.2s', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
          <div className={styles.listHeader}>
            <span className="text-headline">ÚLTIMOS REPOSTAJES</span>
          </div>

          <div className={styles.recordList}>
             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-purple-light)' }}><Beaker size={16} color="white" /></div>
                <div className={styles.recordDetails}>
                  <div className={styles.recordMain}>
                    <span className="text-headline">85.00 €</span>
                    <span className="text-body" style={{ color: 'var(--text-secondary)'}}>55.2L</span>
                  </div>
                  <div className={styles.recordSub}>
                    <span className="text-subhead">1.539 €/L</span>
                    <span className="text-subhead">Hace 1 semana</span>
                  </div>
                </div>
             </div>
             
             <div className={styles.divider} />

             <div className={styles.recordItem}>
                <div className={styles.recordIcon} style={{ background: 'var(--bento-purple-light)' }}><Beaker size={16} color="white" /></div>
                <div className={styles.recordDetails}>
                  <div className={styles.recordMain}>
                    <span className="text-headline">110.50 €</span>
                    <span className="text-body" style={{ color: 'var(--text-secondary)'}}>70.8L</span>
                  </div>
                  <div className={styles.recordSub}>
                    <span className="text-subhead">1.560 €/L</span>
                    <span className="text-subhead">Hace 2 semanas</span>
                  </div>
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  )
}
