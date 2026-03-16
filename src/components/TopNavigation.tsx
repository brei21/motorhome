'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Mail, Navigation } from 'lucide-react'
import styles from './topnav.module.css'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/daily', label: 'Diario' },
  { href: '/odometer', label: 'Ruta' },
  { href: '/maintenance', label: 'Taller' },
  { href: '/fuel', label: 'Gasolina' },
  { href: '/stats', label: 'Archive' },
]

export default function TopNavigation() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      {/* Logo Area */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Navigation size={20} color="white" fill="white" />
        </div>
      </div>

      {/* Main Pill Navbar */}
      <nav className={styles.navPill}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Right Action Icons (Cosmetic to match image) */}
      <div className={styles.actionArea}>
        <button className={styles.iconBtn}>
          <Bell size={18} />
        </button>
        <button className={styles.iconBtn}>
          <Mail size={18} />
        </button>
        <div className={styles.avatar}>
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="User avatar" />
        </div>
      </div>
    </header>
  )
}
