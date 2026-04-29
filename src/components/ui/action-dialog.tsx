'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './action-dialog.module.css'

interface ActionDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  inputLabel?: string
  inputValue?: string
  inputPlaceholder?: string
  inputType?: 'text' | 'password'
  requiredText?: string
  loading?: boolean
  onInputChange?: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  inputLabel,
  inputValue = '',
  inputPlaceholder,
  inputType = 'text',
  requiredText,
  loading = false,
  onInputChange,
  onCancel,
  onConfirm,
}: ActionDialogProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        setTypedConfirmation('')
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [loading, onCancel, open])

  if (!open) return null

  const confirmationOk = requiredText ? typedConfirmation === requiredText : true
  const inputOk = inputLabel ? inputValue.trim().length > 0 : true
  const canConfirm = confirmationOk && inputOk && !loading

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={() => {
        setTypedConfirmation('')
        onCancel()
      }}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={tone === 'danger' ? styles.dangerDot : styles.dot} />
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
        </div>

        {inputLabel ? (
          <label className={styles.field}>
            <span>{inputLabel}</span>
            <input
              autoFocus
              type={inputType}
              value={inputValue}
              placeholder={inputPlaceholder}
              onChange={(event) => onInputChange?.(event.target.value)}
            />
          </label>
        ) : null}

        {requiredText ? (
          <label className={styles.field}>
            <span>Escribe {requiredText} para confirmar</span>
            <input
              value={typedConfirmation}
              placeholder={requiredText}
              onChange={(event) => setTypedConfirmation(event.target.value)}
            />
          </label>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => {
              setTypedConfirmation('')
              onCancel()
            }}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? styles.danger : styles.confirm}
            onClick={() => {
              setTypedConfirmation('')
              onConfirm()
            }}
            disabled={!canConfirm}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
