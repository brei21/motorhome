'use client'

import { useEffect, useId, useRef } from 'react'
import styles from './record-edit-dialog.module.css'

export type RecordEditField = {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox'
  placeholder?: string
  options?: { value: string; label: string }[]
  fullWidth?: boolean
  step?: string
  min?: string
}

type RecordEditValues = Record<string, string | boolean>

interface RecordEditDialogProps {
  open: boolean
  title: string
  description: string
  fields: RecordEditField[]
  values: RecordEditValues
  loading?: boolean
  onChange: (name: string, value: string | boolean) => void
  onCancel: () => void
  onConfirm: () => void
}

export function RecordEditDialog({
  open,
  title,
  description,
  fields,
  values,
  loading = false,
  onChange,
  onCancel,
  onConfirm,
}: RecordEditDialogProps) {
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

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={() => !loading && onCancel()}>
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
          <span className={styles.dot} />
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
        </div>

        <div className={styles.grid}>
          {fields.map((field) => {
            const value = values[field.name]
            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className={`${styles.checkboxField} ${field.fullWidth ? styles.full : ''}`}>
                  <span>{field.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    disabled={loading}
                    onChange={(event) => {
                      onChange(field.name, event.target.checked)
                    }}
                  />
                </label>
              )
            }

            return (
              <label key={field.name} className={`${styles.field} ${field.fullWidth ? styles.full : ''}`}>
                <span>{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={String(value ?? '')}
                    placeholder={field.placeholder}
                    disabled={loading}
                    onChange={(event) => {
                      onChange(field.name, event.target.value)
                    }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={String(value ?? '')}
                    disabled={loading}
                    onChange={(event) => {
                      onChange(field.name, event.target.value)
                    }}
                  >
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type ?? 'text'}
                    value={String(value ?? '')}
                    placeholder={field.placeholder}
                    step={field.step}
                    min={field.min}
                    disabled={loading}
                    onChange={(event) => {
                      onChange(field.name, event.target.value)
                    }}
                  />
                )}
              </label>
            )
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button type="button" className={styles.confirm} onClick={onConfirm} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  )
}
