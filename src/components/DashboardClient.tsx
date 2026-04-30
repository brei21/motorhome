'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Calendar, Flame, Fuel, Gauge, Home, MapPin, Navigation, WalletCards, Wrench } from 'lucide-react'
import Link from 'next/link'
import styles from '@/app/(app)/page.module.css'

type Trip = {
  id: string
  started_at: string | Date
  ended_at: string | Date | null
  start_odometer: number
  end_odometer: number | null
  start_location: string | null
  end_location: string | null
}

type DailyLog = {
  id: string
  date: string | Date
  status: 'travel' | 'parking' | 'motorhome_area' | 'vacation_home'
  latitude: number | null
  longitude: number | null
  location_name: string | null
  fresh_water_filled: boolean
  grey_water_emptied: boolean
  black_water_emptied: boolean
}

type FuelLog = {
  id: string
  date: string | Date
  amount: number
  price_per_liter: number
}

type LpgLog = {
  id: string
  date: string | Date
  amount: number
  quantity: number
  unit: 'liters' | 'kg'
  price_per_unit: number | null
  usage_type: 'cooking' | 'heating' | 'mixed' | 'other'
}

type MaintenanceLog = {
  id: string
  date: string | Date
  type: 'repair' | 'improvement' | 'maintenance'
  description: string
  cost: number | null
  odometer_at: number | null
  due_odometer?: number | null
  due_date?: string | Date | null
}

type VehicleProfile = {
  insurance_due_date: string | Date | null
  inspection_due_date: string | Date | null
}

type VehicleDocument = {
  id: string
  title: string
  expires_at: string | Date | null
}

type DashboardPayload = {
  activeTrip: Trip | null
  trips: Trip[]
  dailyLogs: DailyLog[]
  fuelLogs: FuelLog[]
  lpgLogs: LpgLog[]
  maintenanceLogs: MaintenanceLog[]
  vehicleProfile: VehicleProfile | null
  vehicleDocuments: VehicleDocument[]
  currentOdometer: number
  totals: {
    fuel: number
    lpg: number
    maintenance: number
    daily: number
    overall: number
  }
}

const FALLBACK_CITY = 'Sin datos'

const statusText: Record<DailyLog['status'], string> = {
  travel: 'De viaje',
  parking: 'En parking',
  motorhome_area: 'Área AC',
  vacation_home: 'En casa',
}

const maintenanceText: Record<MaintenanceLog['type'], string> = {
  maintenance: 'Revisión',
  improvement: 'Mejora',
  repair: 'Avería',
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n)

const formatMoney = (n: number) =>
  `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} €`

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return '—'
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function daysSince(logs: DailyLog[], predicate: (log: DailyLog) => boolean) {
  const idx = logs.findIndex(predicate)
  if (idx === -1) return null
  return idx
}

function daysUntil(value: string | Date | null | undefined) {
  if (!value) return null
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export default function DashboardClient({ initialData }: { initialData: DashboardPayload }) {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard')
        const payload = (await response.json()) as DashboardPayload
        if (active) setData(payload)
      } catch (error) {
        console.error('No se pudo refrescar el dashboard', error)
      }
    }

    load()
    const refreshId = setInterval(load, 45_000)
    return () => {
      active = false
      clearInterval(refreshId)
    }
  }, [])

  const latestDaily = data.dailyLogs[0] ?? null
  const lastFuel = data.fuelLogs[0] ?? null
  const lastLpg = data.lpgLogs[0] ?? null
  const tripActive = !!data.activeTrip && !data.activeTrip.ended_at
  const hasAnyData =
    data.dailyLogs.length > 0 ||
    data.fuelLogs.length > 0 ||
    data.lpgLogs.length > 0 ||
    data.maintenanceLogs.length > 0 ||
    data.trips.length > 0 ||
    data.currentOdometer > 0

  const location = useMemo(() => {
    return {
      city: latestDaily?.location_name || FALLBACK_CITY,
      status: latestDaily ? statusText[latestDaily.status] : 'Sin registro',
      since: latestDaily ? formatDate(latestDaily.date) : '—',
    }
  }, [latestDaily])

  const maintenanceSummary = useMemo(() => {
    if (!data.maintenanceLogs.length) {
      return [{ id: 'empty', title: 'Sin historial todavía', subtitle: 'Añade tu primer mantenimiento' }]
    }
    return data.maintenanceLogs.slice(0, 3).map((entry) => {
      const baseKm = entry.odometer_at ?? data.currentOdometer
      const dueKm = entry.type === 'maintenance' ? baseKm + 10_000 : null
      const remaining = dueKm !== null ? dueKm - data.currentOdometer : null
      return {
        id: entry.id,
        title: `${entry.description}`,
        subtitle:
          dueKm === null
            ? `${maintenanceText[entry.type]} · ${entry.odometer_at ? `${formatNumber(entry.odometer_at)} km` : 'sin km'}`
            : `${formatNumber(dueKm)} km · ${remaining !== null && remaining > 0 ? `faltan ${formatNumber(remaining)} km` : 'vencido'}`,
      }
    })
  }, [data.currentOdometer, data.maintenanceLogs])

  const water = useMemo(
    () => ({
      clean: daysSince(data.dailyLogs, (log) => log.fresh_water_filled),
      grey: daysSince(data.dailyLogs, (log) => log.grey_water_emptied),
      black: daysSince(data.dailyLogs, (log) => log.black_water_emptied),
    }),
    [data.dailyLogs]
  )

  const totalTravelDays = data.dailyLogs.filter((log) => log.status === 'travel').length
  const totalSpent = data.totals.overall
  const alerts = [
    data.vehicleProfile?.inspection_due_date ? { label: 'ITV', days: daysUntil(data.vehicleProfile.inspection_due_date) } : null,
    data.vehicleProfile?.insurance_due_date ? { label: 'Seguro', days: daysUntil(data.vehicleProfile.insurance_due_date) } : null,
    ...data.maintenanceLogs
      .filter((log) => log.due_odometer || log.due_date)
      .slice(0, 3)
      .map((log) => ({
        label: log.description,
        days: daysUntil(log.due_date),
        km: log.due_odometer ? log.due_odometer - data.currentOdometer : null,
      })),
    ...data.vehicleDocuments
      .filter((doc) => doc.expires_at)
      .slice(0, 3)
      .map((doc) => ({ label: doc.title, days: daysUntil(doc.expires_at) })),
  ].filter(Boolean) as { label: string; days?: number | null; km?: number | null }[]

  return (
    <div className={styles.dashboardContainer}>
      <motion.header
        className={styles.dashboardHeader}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className={styles.headerLeft}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>Motorhome</span>
            <span className={styles.brandTitle}>Cuaderno de viaje</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerLocation}>
            <MapPin size={16} />
            <span>{location.city}</span>
          </div>
          <div className={styles.headerWeather}>
            <Calendar size={16} />
            <span>Ultimo registro</span>
            <span className={styles.weatherCondition}>{location.since}</span>
          </div>
        </div>
      </motion.header>

      <motion.section
        className={styles.heroSection}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
      >
        <div className={styles.heroMedia}>
          <div className={styles.heroFrame}>
            <Image src="/motorhome-brand.png" alt="Autocaravana junto a un faro" fill priority className={styles.heroImage} />
            <div className={styles.heroCaption}>
              <span className={styles.heroCaptionLabel}>{hasAnyData ? location.city : 'Sin ubicacion'}</span>
              <strong>{tripActive ? 'Ruta en curso' : hasAnyData ? 'Vehiculo estacionado' : 'Sin actividad registrada'}</strong>
            </div>
          </div>

          <div className={styles.heroAside}>
            <div className={styles.heroMiniStat}>
              <span className={styles.heroMiniLabel}>Odometro</span>
              <strong>{formatNumber(data.currentOdometer)} km</strong>
            </div>
            <div className={styles.heroMiniStat}>
              <span className={styles.heroMiniLabel}>Gasto total</span>
              <strong>{formatMoney(totalSpent)}</strong>
            </div>
            <div className={styles.heroMiniStat}>
              <span className={styles.heroMiniLabel}>Viajes</span>
              <strong>{totalTravelDays} dias</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroCopy}>
          <div>
            <p className={styles.heroEyebrow}>{hasAnyData ? 'Estado actual' : 'Preparado para empezar'}</p>
            <h1 className={styles.heroTitle}>
              {tripActive ? 'Viaje en curso.' : hasAnyData ? 'Autocaravana estacionada.' : 'Empieza tu cuaderno de viaje.'}
            </h1>
            <p className={styles.heroText}>
              {hasAnyData
                ? 'Resumen rapido de ubicacion, odometro, gasto acumulado y actividad reciente.'
                : 'Crea tu primer registro diario, inicia un viaje o anota el odometro para empezar.'}
            </p>
          </div>

          <div className={styles.heroControlPanel}>
            <div className={styles.heroActions}>
              <Link href="/daily" className={styles.primaryCta}>
                Nuevo dia
              </Link>
              <Link href="/odometer" className={styles.secondaryCta}>
                Ruta y odometro
              </Link>
            </div>

            <div className={styles.heroPills}>
              <span className={styles.heroPill}>{tripActive ? 'Viaje activo' : 'Sin viaje activo'}</span>
              <span className={styles.heroPill}>{hasAnyData ? location.city : 'Sin ubicacion guardada'}</span>
              <span className={styles.heroPill}>{hasAnyData ? formatDate(latestDaily?.date || null) : 'Sin fecha registrada'}</span>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={styles.metricsGrid}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14 }}
      >
        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: 'var(--brand-orange-soft)', color: 'var(--brand-orange)' }}>
            <Gauge size={20} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricValue}>{formatNumber(data.currentOdometer)}</span>
            <span className={styles.metricLabel}>Odometro total</span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#fff4ea', color: '#f97316' }}>
            <WalletCards size={20} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricValue}>{formatNumber(totalSpent)} €</span>
            <span className={styles.metricLabel}>Gasto total</span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#f3f6ff', color: '#2563eb' }}>
            <Calendar size={20} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricValue}>{totalTravelDays}</span>
            <span className={styles.metricLabel}>Dias de viaje</span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#f7f1ff', color: '#8b5cf6' }}>
            <Fuel size={20} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricValue}>{lastFuel ? formatMoney(lastFuel.amount) : '—'}</span>
            <span className={styles.metricLabel}>{lastFuel ? `Ultimo: ${formatDate(lastFuel.date)}` : 'Sin repostajes'}</span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={styles.metricIcon} style={{ background: '#fff7ed', color: '#ea580c' }}>
            <Flame size={20} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricValue}>{lastLpg ? formatMoney(lastLpg.amount) : '—'}</span>
            <span className={styles.metricLabel}>{lastLpg ? `GLP: ${formatDate(lastLpg.date)}` : 'Sin GLP'}</span>
          </div>
        </div>
      </motion.section>

      <motion.div
        className={styles.cardsRow}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.22 }}
      >
        <div className={styles.infoCard}>
          <div className={styles.cardHeaderLine}>
            <h3 className={styles.cardTitle}>Ultimo repostaje</h3>
            <span className={styles.cardMeta}>{lastFuel ? formatDate(lastFuel.date) : 'Pendiente'}</span>
          </div>
          {lastFuel ? (
            <div className={styles.fuelInfo}>
              <span className={styles.fuelAmount}>{formatMoney(lastFuel.amount)}</span>
              <span className={styles.fuelLiters}>
                {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(lastFuel.price_per_liter)} €/L
              </span>
            </div>
          ) : (
            <span className={styles.cardEmpty}>Aun no hay repostajes registrados.</span>
          )}
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeaderLine}>
            <h3 className={styles.cardTitle}>Último GLP</h3>
            <span className={styles.cardMeta}>{lastLpg ? formatDate(lastLpg.date) : 'Pendiente'}</span>
          </div>
          {lastLpg ? (
            <div className={styles.fuelInfo}>
              <span className={styles.fuelAmount}>{formatMoney(lastLpg.amount)}</span>
              <span className={styles.fuelLiters}>
                {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(lastLpg.quantity)} {lastLpg.unit === 'liters' ? 'L' : 'kg'}
              </span>
            </div>
          ) : (
            <span className={styles.cardEmpty}>Aun no hay GLP registrado.</span>
          )}
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeaderLine}>
            <h3 className={styles.cardTitle}>Mantenimiento por odometro</h3>
            <span className={styles.cardMeta}>Control simple</span>
          </div>
          <ul className={styles.maintenanceList}>
            {maintenanceSummary.map((item) => (
              <li key={item.id} className={styles.maintenanceItem}>
                <span>{item.title}</span>
                <span className={styles.maintenanceDate}>{item.subtitle}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {alerts.length > 0 && (
        <motion.section
          className={styles.alertSection}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26 }}
        >
          <div className={styles.cardHeaderLine}>
            <h3 className={styles.cardTitle}>Alertas visibles</h3>
            <span className={styles.cardMeta}>Fechas y kilometros</span>
          </div>
          <div className={styles.alertGrid}>
            {alerts.map((alert) => (
              <div key={`${alert.label}-${alert.days}-${alert.km}`} className={styles.alertItem}>
                <strong>{alert.label}</strong>
                <span>
                  {alert.km !== null && alert.km !== undefined
                    ? alert.km > 0 ? `faltan ${formatNumber(alert.km)} km` : 'vencido por km'
                    : alert.days !== null && alert.days !== undefined
                      ? alert.days >= 0 ? `vence en ${alert.days} dias` : `vencido hace ${Math.abs(alert.days)} dias`
                      : 'sin fecha'}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        className={styles.waterSection}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
      >
        <div className={styles.cardHeaderLine}>
          <h3 className={styles.cardTitle}>Agua</h3>
          <span className={styles.cardMeta}>Ultima actividad registrada</span>
        </div>
        <div className={styles.waterBars}>
          <div className={styles.waterBar}>
            <div className={styles.waterBarTrack}>
              <div className={styles.waterBarFill} style={{ width: `${water.clean === null ? 0 : clamp(100 - water.clean * 12, 15, 100)}%`, background: 'var(--brand-orange)' }} />
            </div>
            <span className={styles.waterBarLabel}>Limpia</span>
            <span className={styles.waterBarDays}>{water.clean === null ? '—' : `${water.clean} d`}</span>
          </div>
          <div className={styles.waterBar}>
            <div className={styles.waterBarTrack}>
              <div className={styles.waterBarFill} style={{ width: `${water.grey === null ? 0 : clamp(100 - water.grey * 12, 15, 100)}%`, background: '#d1d5db' }} />
            </div>
            <span className={styles.waterBarLabel}>Gris</span>
            <span className={styles.waterBarDays}>{water.grey === null ? '—' : `${water.grey} d`}</span>
          </div>
          <div className={styles.waterBar}>
            <div className={styles.waterBarTrack}>
              <div className={styles.waterBarFill} style={{ width: `${water.black === null ? 0 : clamp(100 - water.black * 12, 15, 100)}%`, background: '#9ca3af' }} />
            </div>
            <span className={styles.waterBarLabel}>Negra</span>
            <span className={styles.waterBarDays}>{water.black === null ? '—' : `${water.black} d`}</span>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={styles.quickActions}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.38 }}
      >
        <Link href="/daily" className={styles.actionButton}>
          <Calendar size={18} />
          <span>Diario</span>
        </Link>
        <Link href="/fuel" className={styles.actionButton}>
          <Fuel size={18} />
          <span>Gasolina</span>
        </Link>
        <Link href="/maintenance" className={styles.actionButton}>
          <Wrench size={18} />
          <span>Taller</span>
        </Link>
        <Link href="/odometer" className={styles.actionButton}>
          <Navigation size={18} />
          <span>Ruta</span>
        </Link>
        <Link href="/stats" className={styles.actionButton}>
          <Home size={18} />
          <span>Archivo</span>
        </Link>
      </motion.section>
    </div>
  )
}
