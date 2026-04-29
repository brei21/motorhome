import { getStatsByStatus } from '@/app/actions/daily-records'
import { getTotalKilometers } from '@/app/actions/odometer-records'
import { getTotalMaintenanceCost } from '@/app/actions/maintenance-records'
import { getTotalFuelCost } from '@/app/actions/fuel-records'
import { Activity, MapPin, Wrench, Fuel, BarChart3, Navigation, Home } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

export const revalidate = 0 // Disable cache for this page so stats are always fresh

export default async function StatsPage() {
  const [dailyStats, totalKm, totalMaintenance, totalFuel] = await Promise.all([
    getStatsByStatus(),
    getTotalKilometers(),
    getTotalMaintenanceCost(),
    getTotalFuelCost(),
  ])

  const totalDays = dailyStats.travel + dailyStats.parking + dailyStats.vacation_home
  const hasData = totalDays > 0 || totalKm > 0 || totalMaintenance > 0 || totalFuel > 0
  const formatNumber = (n: number) => new Intl.NumberFormat('es-ES').format(n)
  const formatMoney = (n: number) =>
    `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <p className={styles.kicker}>Archivo</p>
        <h1 className="text-title-1">Estadisticas</h1>
        <p className={styles.headerText}>
          {hasData
            ? 'Resumen consolidado de kilometros, dias y gastos registrados.'
            : 'Todavia no hay datos guardados para generar estadisticas.'}
        </p>
      </header>

      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <h2 className={styles.heroTitle}>
            {hasData ? 'Resumen general del historial guardado.' : 'Esta seccion mostrara tu historial cuando empieces a registrar datos.'}
          </h2>
          <p className={styles.heroText}>
            {hasData
              ? 'Consulta kilometros, gastos y distribucion de dias en una sola vista.'
              : 'Empieza por Diario, Ruta, Gasolina o Taller para ver aqui el acumulado real del vehiculo.'}
          </p>
          {!hasData && (
            <div className={styles.emptyActions}>
              <Link href="/odometer">Configurar odómetro</Link>
              <Link href="/daily">Primer registro diario</Link>
            </div>
          )}
        </div>
        <div className={styles.summaryRow}>
          <div className={styles.summaryPill}>
            <span className={styles.summaryLabel}>Total km</span>
            <strong>{formatNumber(totalKm)}</strong>
          </div>
          <div className={styles.summaryPill}>
            <span className={styles.summaryLabel}>Dias</span>
            <strong>{formatNumber(totalDays)}</strong>
          </div>
          <div className={styles.summaryPill}>
            <span className={styles.summaryLabel}>Gasto</span>
            <strong>{formatMoney(totalFuel + totalMaintenance)}</strong>
          </div>
        </div>
      </section>

      {!hasData && (
        <section className={styles.onboardingCard}>
          <div>
            <p className={styles.kicker}>Primeros pasos</p>
            <h2>Completa tres datos y el archivo empezará a tener valor.</h2>
          </div>
          <div className={styles.stepsGrid}>
            <Link href="/odometer" className={styles.stepItem}>
              <Navigation size={18} />
              <strong>1. Mete el odómetro</strong>
              <span>Sirve como base para mantenimiento, viajes y costes por km.</span>
            </Link>
            <Link href="/daily" className={styles.stepItem}>
              <MapPin size={18} />
              <strong>2. Guarda un día</strong>
              <span>La bitácora crea ubicación, estado y contexto del viaje.</span>
            </Link>
            <Link href="/fuel" className={styles.stepItem}>
              <Fuel size={18} />
              <strong>3. Añade un repostaje</strong>
              <span>Con dos repostajes completos podremos calcular consumo real.</span>
            </Link>
          </div>
        </section>
      )}

      <div className={styles.grid}>
        <section className={`${styles.card} animate-slide-up`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.blue}`}>
              <Activity size={24} color="white" />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Total recorrido</h2>
              <p className={styles.cardSubtitle}>Kilometros acumulados</p>
            </div>
          </div>
          <div className={styles.cardContent}>
            <span className={styles.bigValue}>
              {formatNumber(totalKm)} <span className={styles.unit}>km</span>
            </span>
          </div>
        </section>

        <section className={`${styles.card} animate-slide-up`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.orange}`}>
              <BarChart3 size={24} color="white" />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Gastos totales</h2>
              <p className={styles.cardSubtitle}>Taller y combustible</p>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.statRow}>
              <span className="text-body">
                <Wrench size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Taller
              </span>
              <span className={styles.statValue}>{formatMoney(totalMaintenance)}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.statRow}>
              <span className="text-body">
                <Fuel size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Gasolina
              </span>
              <span className={styles.statValue}>{formatMoney(totalFuel)}</span>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.cardWide} animate-slide-up`} style={{ animationDelay: '0.3s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.green}`}>
              <MapPin size={24} color="white" />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Distribucion de dias</h2>
              <p className={styles.cardSubtitle}>{totalDays} dias en total</p>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div
              className={styles.progressBarWrapper}
              style={{ width: `${totalDays > 0 ? (dailyStats.travel / totalDays) * 100 : 0}%`, background: 'var(--brand-orange)' }}
            />
            <div
              className={styles.progressBarWrapper}
              style={{ width: `${totalDays > 0 ? (dailyStats.parking / totalDays) * 100 : 0}%`, background: '#f97316' }}
            />
            <div
              className={styles.progressBarWrapper}
              style={{ width: `${totalDays > 0 ? (dailyStats.vacation_home / totalDays) * 100 : 0}%`, background: '#8b5cf6' }}
            />
          </div>

          <div className={styles.legendContainer}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--brand-orange)' }} />
              <Navigation size={14} className={styles.legendIcon} />
              <span className="text-subhead">Viaje ({dailyStats.travel} d)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: '#f97316' }} />
              <MapPin size={14} className={styles.legendIcon} />
              <span className="text-subhead">Parking ({dailyStats.parking} d)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: '#8b5cf6' }} />
              <Home size={14} className={styles.legendIcon} />
              <span className="text-subhead">Casa ({dailyStats.vacation_home} d)</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
