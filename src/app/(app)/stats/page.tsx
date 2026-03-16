import { getStatsByStatus } from '@/app/actions/daily-records'
import { getTotalKilometers } from '@/app/actions/odometer-records'
import { getTotalMaintenanceCost } from '@/app/actions/maintenance-records'
import { getTotalFuelCost } from '@/app/actions/fuel-records'
import { Activity, MapPin, Wrench, Fuel, BarChart3, Navigation, Home } from 'lucide-react'
import styles from './page.module.css'

export const revalidate = 0 // Disable cache for this page so stats are always fresh

export default async function StatsPage() {
  const [
    dailyStats,
    totalKm,
    totalMaintenance,
    totalFuel
  ] = await Promise.all([
    getStatsByStatus(),
    getTotalKilometers(),
    getTotalMaintenanceCost(),
    getTotalFuelCost()
  ])

  const totalDays = dailyStats.travel + dailyStats.parking + dailyStats.vacation_home

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="text-title-1">Estadísticas</h1>
        <p className="text-subhead">Resumen general de tu autocaravana</p>
      </header>

      <div className={styles.grid}>
        
        {/* Kilometers Card */}
        <section className={`${styles.card} glass-panel-elevated animate-slide-up`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.blue}`}>
              <Activity size={24} color="white" />
            </div>
            <h2 className="text-headline">Total Recorrido</h2>
          </div>
          <div className={styles.cardContent}>
            <span className="text-title-1">{totalKm.toLocaleString()} <span className="text-subhead">km</span></span>
          </div>
        </section>

        {/* Financials Card */}
        <section className={`${styles.card} glass-panel-elevated animate-slide-up`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.orange}`}>
              <BarChart3 size={24} color="white" />
            </div>
            <h2 className="text-headline">Gastos Totales</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.statRow}>
              <span className="text-body"><Wrench size={16} style={{display: 'inline', marginRight: 8, verticalAlign: 'text-bottom'}} /> Taller</span>
              <span className="text-headline">{totalMaintenance.toFixed(2)} €</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.statRow}>
              <span className="text-body"><Fuel size={16} style={{display: 'inline', marginRight: 8, verticalAlign: 'text-bottom'}} /> Gasolina</span>
              <span className="text-headline">{totalFuel.toFixed(2)} €</span>
            </div>
          </div>
        </section>

        {/* Daily Records Stats */}
        <section className={`${styles.card} glass-panel-elevated animate-slide-up col-span-2`} style={{ animationDelay: '0.3s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.green}`}>
              <MapPin size={24} color="white" />
            </div>
            <h2 className="text-headline">Distribución de Días ({totalDays} total)</h2>
          </div>
          
          <div className={styles.progressContainer}>
            <div 
              className={styles.progressBarWrapper} 
              style={{ width: `${totalDays > 0 ? (dailyStats.travel / totalDays) * 100 : 0}%`, background: 'var(--accent-blue)' }} 
            />
            <div 
              className={styles.progressBarWrapper} 
              style={{ width: `${totalDays > 0 ? (dailyStats.parking / totalDays) * 100 : 0}%`, background: 'var(--accent-orange)' }} 
            />
            <div 
              className={styles.progressBarWrapper} 
              style={{ width: `${totalDays > 0 ? (dailyStats.vacation_home / totalDays) * 100 : 0}%`, background: 'var(--accent-green)' }} 
            />
          </div>

          <div className={styles.legendContainer}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--accent-blue)' }} />
              <Navigation size={14} className={styles.legendIcon} />
              <span className="text-subhead">Viaje ({dailyStats.travel} d)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--accent-orange)' }} />
              <MapPin size={14} className={styles.legendIcon} />
              <span className="text-subhead">Parking ({dailyStats.parking} d)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--accent-green)' }} />
              <Home size={14} className={styles.legendIcon} />
              <span className="text-subhead">Casa ({dailyStats.vacation_home} d)</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
