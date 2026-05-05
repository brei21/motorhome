'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import styles from './page.module.css'

type SearchResult = {
  id: string
  type: string
  title: string
  subtitle: string | null
  date: string | null
  href: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        const payload = await response.json()
        setResults(Array.isArray(payload) ? payload : [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Búsqueda global</p>
        <h1>Encuentra cualquier registro.</h1>
        <p>Busca ciudades, notas, viajes, repostajes, GLP, taller, favoritos o documentos del vehículo.</p>
      </header>

      <section className={styles.searchPanel}>
        <label className={styles.searchBox}>
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Girona, aceite, camping, GLP..." autoFocus />
          {loading && <Loader2 size={18} className="spinning" />}
        </label>
      </section>

      <section className={styles.resultsPanel}>
        {query.trim().length < 2 ? (
          <div className={styles.empty}>Escribe al menos 2 caracteres para buscar.</div>
        ) : !loading && results.length === 0 ? (
          <div className={styles.empty}>No hay resultados para “{query.trim()}”.</div>
        ) : results.map((result) => (
          <Link key={`${result.type}-${result.id}`} href={result.href} className={styles.resultItem}>
            <span className={styles.typeBadge}>{result.type}</span>
            <span className={styles.resultText}>
              <strong>{result.title}</strong>
              {result.subtitle && <span>{result.subtitle}</span>}
            </span>
            <span className={styles.resultDate}>{result.date ? String(result.date).slice(0, 10) : '—'}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
