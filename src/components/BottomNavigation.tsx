'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarDays, Fuel, LayoutDashboard, Plus, Route, Wrench } from 'lucide-react'
import styles from './bottomnav.module.css'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/current-trip', icon: Plus, label: 'Actual' },
  { href: '/daily', icon: CalendarDays, label: 'Diario' },
  { href: '/odometer', icon: Route, label: 'Ruta' },
  { href: '/maintenance', icon: Wrench, label: 'Taller' },
  { href: '/fuel', icon: Fuel, label: 'Gasolina' },
]

export default function BottomNavigation() {
  const pathname = usePathname()

  return (
    <motion.nav
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={styles.bottomNav}
      aria-label="Barra de navegación inferior"
    >
      <div className={styles.navContainer}>
        <div className={styles.navShell}>
          <div className={styles.navWrapper}>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={styles.navIcon}>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
