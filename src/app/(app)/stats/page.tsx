import { getStatsByStatus, getTotalAccommodationCost } from '@/app/actions/daily-records'
import { getTotalKilometers } from '@/app/actions/odometer-records'
import { getTotalMaintenanceCost } from '@/app/actions/maintenance-records'
import { getTotalFuelCost } from '@/app/actions/fuel-records'
import { getTotalLpgCost } from '@/app/actions/lpg-records'
import { query } from '@/lib/db'
import { Activity, MapPin, Wrench, Fuel, BarChart3, Navigation, Home, Flame } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

export const revalidate = 0 // Disable cache for this page so stats are always fresh

export default async function StatsPage() {
  const [dailyStats, totalKm, totalMaintenance, totalFuel, totalLpg, totalDaily, periodRows] = await Promise.all([
    getStatsByStatus(),
    getTotalKilometers(),
    getTotalMaintenanceCost(),
    getTotalFuelCost(),
    getTotalLpgCost(),
    getTotalAccommodationCost(),
    getPeriodSummary(),
  ])

  const totalDays = dailyStats.travel + dailyStats.parking + dailyStats.motorhome_area + dailyStats.vacation_home
  const hasData = totalDays > 0 || totalKm > 0 || totalMaintenance > 0 || totalFuel > 0 || totalLpg > 0 || totalDaily > 0
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
            <strong>{formatMoney(totalFuel + totalLpg + totalMaintenance + totalDaily)}</strong>
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
              <p className={styles.cardSubtitle}>Diario, taller y combustible</p>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.statRow}>
              <span className="text-body">
                <MapPin size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Diario
              </span>
              <span className={styles.statValue}>{formatMoney(totalDaily)}</span>
            </div>
            <div className={styles.divider} />
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
            <div className={styles.divider} />
            <div className={styles.statRow}>
              <span className="text-body">
                <Flame size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                GLP
              </span>
              <span className={styles.statValue}>{formatMoney(totalLpg)}</span>
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
              style={{ width: `${totalDays > 0 ? (dailyStats.motorhome_area / totalDays) * 100 : 0}%`, background: '#0ea5e9' }}
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
              <div className={styles.legendDot} style={{ background: '#0ea5e9' }} />
              <MapPin size={14} className={styles.legendIcon} />
              <span className="text-subhead">Área AC ({dailyStats.motorhome_area} d)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: '#8b5cf6' }} />
              <Home size={14} className={styles.legendIcon} />
              <span className="text-subhead">Casa ({dailyStats.vacation_home} d)</span>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.cardWide} animate-slide-up`} style={{ animationDelay: '0.4s' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrapper} ${styles.orange}`}>
              <BarChart3 size={24} color="white" />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Resumen mensual y anual</h2>
              <p className={styles.cardSubtitle}>Últimos periodos con actividad real</p>
            </div>
          </div>

          {periodRows.length === 0 ? (
            <div className={styles.periodEmpty}>Cuando haya datos, aquí verás gastos y días agrupados por mes.</div>
          ) : (
            <div className={styles.periodTable}>
              <div className={styles.periodHead}>
                <span>Periodo</span>
                <span>Días</span>
                <span>Gasolina</span>
                <span>GLP</span>
                <span>Taller</span>
                <span>Diario</span>
                <span>Total</span>
              </div>
              {periodRows.map((row) => {
                const total = row.fuel + row.lpg + row.maintenance + row.daily
                return (
                  <div key={row.period} className={styles.periodRow}>
                    <strong>{row.period}</strong>
                    <span>{formatNumber(row.days)}</span>
                    <span>{formatMoney(row.fuel)}</span>
                    <span>{formatMoney(row.lpg)}</span>
                    <span>{formatMoney(row.maintenance)}</span>
                    <span>{formatMoney(row.daily)}</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

async function getPeriodSummary() {
  const res = await query<{
    period: string
    days: string
    fuel: string | null
    lpg: string | null
    maintenance: string | null
    daily: string | null
  }>(
    `
      WITH periods AS (
        SELECT date_trunc('month', date)::date AS month FROM daily_logs
        UNION SELECT date_trunc('month', date)::date FROM fuel_logs
        UNION SELECT date_trunc('month', date)::date FROM lpg_logs
        UNION SELECT date_trunc('month', date)::date FROM maintenance_logs
      )
      SELECT
        to_char(periods.month, 'YYYY-MM') AS period,
        COALESCE((SELECT COUNT(*)::int FROM daily_logs d WHERE date_trunc('month', d.date)::date = periods.month), 0)::text AS days,
        COALESCE((SELECT SUM(amount) FROM fuel_logs f WHERE date_trunc('month', f.date)::date = periods.month), 0)::text AS fuel,
        COALESCE((SELECT SUM(amount) FROM lpg_logs l WHERE date_trunc('month', l.date)::date = periods.month), 0)::text AS lpg,
        COALESCE((SELECT SUM(cost) FROM maintenance_logs m WHERE date_trunc('month', m.date)::date = periods.month), 0)::text AS maintenance,
        COALESCE((SELECT SUM(COALESCE(accommodation_cost, 0) + COALESCE(daily_expenses, 0)) FROM daily_logs d WHERE date_trunc('month', d.date)::date = periods.month), 0)::text AS daily
      FROM periods
      ORDER BY periods.month DESC
      LIMIT 12
    `
  )

  return res.rows.map((row) => ({
    period: row.period,
    days: Number(row.days) || 0,
    fuel: row.fuel ? Number(row.fuel) : 0,
    lpg: row.lpg ? Number(row.lpg) : 0,
    maintenance: row.maintenance ? Number(row.maintenance) : 0,
    daily: row.daily ? Number(row.daily) : 0,
  }))
}
