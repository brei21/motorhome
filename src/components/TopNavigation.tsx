'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Menu, Shield } from 'lucide-react'
import { useState } from 'react'
import styles from './topnav.module.css'

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/current-trip', label: 'Viaje actual' },
  { href: '/daily', label: 'Diario' },
  { href: '/odometer', label: 'Ruta' },
  { href: '/maintenance', label: 'Taller' },
  { href: '/fuel', label: 'Gasolina' },
  { href: '/lpg', label: 'GLP' },
  { href: '/stats', label: 'Archivo' },
]

export default function TopNavigation() {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className={styles.header}
    >
      <Link href="/" className={styles.brand} aria-label="Motorhome dashboard">
        <span className={styles.brandMark}>
          <Image
            src="/motorhome-logo.jpg"
            alt="Logo Motorhome"
            width={44}
            height={44}
            className={styles.brandImage}
            priority
          />
        </span>
        <span className={styles.brandCopy}>
          <span className={styles.brandTitle}>Motorhome</span>
          <span className={styles.brandSubtitle}>Cuaderno de viaje</span>
        </span>
      </Link>

      <nav className={styles.navTabs} aria-label="Secciones principales">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className={styles.actions}>
        <Link
          href="/settings"
          className={styles.iconButton}
          aria-label="Seguridad"
        >
          <Shield size={18} />
        </Link>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className={styles.iconButton}
          aria-label="Cerrar sesion"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={18} />
        </motion.button>
        <Link href="/settings" className={styles.avatarButton} aria-label="Abrir seguridad">
          <Image src="/motorhome-logo.jpg" alt="Logo Motorhome" width={44} height={44} className={styles.avatarImage} />
          <span className={styles.avatarMenu}>
            <Menu size={14} />
          </span>
        </Link>
      </div>
    </motion.header>
  )
}
