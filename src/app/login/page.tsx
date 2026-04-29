'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '@/lib/auth/policy'
import styles from './login.module.css'

export default function LoginScreen() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  const handleLogin = useCallback(async () => {
    if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH || loading || unlocked) {
      return
    }

    setLoading(true)
    setError(null)
    triggerHaptic(50)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const payload = (await res.json().catch(() => null)) as { error?: string; retryAfterSeconds?: number } | null

      if (res.ok) {
        setUnlocked(true)
        triggerHaptic([50, 50, 50])
        setTimeout(() => {
          const nextPath =
            typeof window === 'undefined'
              ? '/'
              : new URLSearchParams(window.location.search).get('next') || '/'
          window.location.href = nextPath.startsWith('/') ? nextPath : '/'
        }, 800)
        return
      }

      const retryHint = payload?.retryAfterSeconds
        ? ` Demasiados intentos. Espera ${payload.retryAfterSeconds}s.`
        : ''

      setError(`PIN incorrecto.${retryHint}`)
      triggerHaptic([100, 50, 100])
      setTimeout(() => {
        setPin('')
        setLoading(false)
      }, 500)
    } catch {
      setError('No se pudo validar el PIN.')
      triggerHaptic([100, 50, 100])
      setPin('')
      setLoading(false)
    }
  }, [loading, pin, triggerHaptic, unlocked])

  const handleNumberClick = useCallback(
    (num: number) => {
      if (pin.length < PIN_MAX_LENGTH && !loading && !unlocked) {
        triggerHaptic(10)
        setError(null)
        setPin((prev) => prev + num)
      }
    },
    [loading, pin.length, triggerHaptic, unlocked]
  )

  const handleDelete = useCallback(() => {
    if (!loading && !unlocked) {
      triggerHaptic(10)
      setPin((prev) => prev.slice(0, -1))
    }
  }, [loading, triggerHaptic, unlocked])

  return (
    <div className={styles.shell}>
      <aside className={styles.photoPane} aria-hidden>
        <Image
          src="/motorhome-brand.png"
          alt="Autocaravana junto a un faro"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          className={styles.photo}
        />
        <div className={styles.photoScrim} />
        <div className={styles.photoCopy}>
          <span className={styles.photoEyebrow}>Acceso privado</span>
          <h2 className={styles.photoTitle}>Acceso a tu area privada.</h2>
          <p className={styles.photoBody}>
            PIN cifrado, sesion firmada y bloqueo temporal tras multiples intentos fallidos.
          </p>
          <div className={styles.photoDots} aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      </aside>

      <main className={styles.formPane}>
        <section className={`${styles.card} ${error ? styles.cardError : ''} ${unlocked ? styles.cardUnlocked : ''}`}>
          <span className={styles.statusChip}>Acceso privado</span>

          <div className={styles.iconContainer}>
            {loading ? (
              <Loader2 className={styles.spinning} size={44} />
            ) : unlocked ? (
              <Unlock size={44} />
            ) : (
              <Lock size={44} />
            )}
          </div>

          <h1 className={styles.title}>Motorhome</h1>
          <p className={styles.subtitle}>
            {error ? <span className={styles.errorText}>{error}</span> : `Introduce tu PIN de ${PIN_MIN_LENGTH} a ${PIN_MAX_LENGTH} digitos para continuar.`}
          </p>

          <div className={styles.pinDots} aria-label="Estado del PIN">
            {[...Array(PIN_MAX_LENGTH)].map((_, index) => {
              const filled = index < pin.length
              const active = index === pin.length && !loading && !unlocked

              return (
                <span
                  key={index}
                  className={[
                    styles.pinDot,
                    filled ? styles.pinDotFilled : '',
                    active ? styles.pinDotActive : '',
                    error ? styles.pinDotError : '',
                    unlocked ? styles.pinDotSuccess : '',
                  ].join(' ')}
                />
              )
            })}
          </div>

          <label className={styles.inputLabel} htmlFor="pin-input">
            PIN
          </label>
          <input
            id="pin-input"
            className={styles.pinInput}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]*"
            value={pin}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)
              setPin(nextValue)
              setError(null)
            }}
            disabled={loading || unlocked}
            placeholder="Introduce tu PIN"
            aria-label="Introduce tu PIN"
          />

          <div className={styles.ctaRow}>
            <span className={styles.ctaPill}>Sesion firmada</span>
            <span className={styles.ctaNote}>El acceso expira automaticamente y nunca se guarda un PIN en claro.</span>
          </div>

          <div className={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className={styles.numBtn}
                onClick={() => handleNumberClick(num)}
                disabled={loading || unlocked}
                type="button"
              >
                <span>{num}</span>
              </button>
            ))}

            <button
              className={`${styles.numBtn} ${styles.actionBtn}`}
              onClick={handleLogin}
              disabled={loading || unlocked || pin.length < PIN_MIN_LENGTH}
              type="button"
            >
              <span>Entrar</span>
            </button>

            <button
              className={styles.numBtn}
              onClick={() => handleNumberClick(0)}
              disabled={loading || unlocked}
              type="button"
            >
              <span>0</span>
            </button>

            <button
              className={`${styles.numBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              disabled={loading || unlocked || pin.length === 0}
              type="button"
            >
              <span>Borrar</span>
            </button>
          </div>

          <p className={styles.footerHint}>Usa un PIN mas largo desde Seguridad para mejorar la resistencia frente a adivinacion.</p>
        </section>
      </main>
    </div>
  )
}
