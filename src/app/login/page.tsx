'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'
import { Lock, Unlock, Loader2 } from 'lucide-react'

export default function LoginScreen() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Attempt login when PIN reaches 6 digits
    if (pin.length === 6) {
      handleLogin(pin)
    }
  }, [pin])

  const handleLogin = async (currentPin: string) => {
    setLoading(true)
    setError(false)
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      })
      
      if (res.ok) {
        setUnlocked(true)
        // Delay to show unlock animation
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 800)
      } else {
        setError(true)
        setTimeout(() => setPin(''), 500) // Clear pin after error shake
        setLoading(false)
      }
    } catch (e) {
      setError(true)
      setPin('')
      setLoading(false)
    } finally {
      // res is not available here, so setLoading(false) is handled in the blocks above

    }
  }

  const handleNumberClick = (num: number) => {
    if (pin.length < 6 && !loading && !unlocked) {
      setError(false)
      setPin(prev => prev + num)
    }
  }

  const handleDelete = () => {
    if (!loading && !unlocked) {
      setPin(prev => prev.slice(0, -1))
    }
  }

  return (
    <div className={styles.container}>
      {/* Background ambient blobs */}
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      
      <div className={`${styles.glassCard} glass-panel-elevated animate-slide-up ${error ? styles.shake : ''} ${unlocked ? styles.unlocking : ''}`}>
        
        <div className={styles.iconContainer}>
          {loading ? (
            <Loader2 className={styles.spinning} size={48} color="var(--accent-blue)" />
          ) : unlocked ? (
            <Unlock size={48} color="var(--accent-green)" className="animate-fade-in" />
          ) : (
            <Lock size={48} color={error ? "var(--accent-red)" : "var(--text-primary)"} />
          )}
        </div>
        
        <h1 className="text-title-2">Motorhome</h1>
        <p className="text-subhead" style={{ marginBottom: 32 }}>
          {error ? <span style={{ color: 'var(--accent-red)' }}>PIN incorrecto</span> : 'Introduce tu PIN maestro'}
        </p>

        {/* PIN Dots Tracker */}
        <div className={styles.pinDots}>
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`${styles.dot} ${i < pin.length ? styles.dotFilled : i === pin.length && !loading && !unlocked ? styles.dotActive : ''} ${error ? styles.dotError : ''} ${unlocked ? styles.dotSuccess : ''}`} 
            />
          ))}
        </div>

        {/* Numpad */}
        <div className={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              className={`${styles.numBtn} interactive-element`}
              onClick={() => handleNumberClick(num)}
              disabled={loading || unlocked}
            >
              <span className="text-title-2">{num}</span>
            </button>
          ))}
          <div className={styles.spacer} />
          <button 
            className={`${styles.numBtn} interactive-element`}
            onClick={() => handleNumberClick(0)}
            disabled={loading || unlocked}
          >
            <span className="text-title-2">0</span>
          </button>
          <button 
            className={`${styles.numBtn} ${styles.deleteBtn} interactive-element`}
            onClick={handleDelete}
            disabled={loading || unlocked || pin.length === 0}
          >
            <span className="text-headline">Borrar</span>
          </button>
        </div>

      </div>
    </div>
  )
}
