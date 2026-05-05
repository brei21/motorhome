import Link from 'next/link'
import { CalendarDays, Flame, Fuel, Navigation, Plus, Route, Wrench } from 'lucide-react'
import { getActiveTrip, getTripDetail } from '@/app/actions/trips'
import { getCurrentOdometer } from '@/app/actions/odometer-records'
import { LiveTripConsole } from './LiveTripConsole'
import styles from './page.module.css'

export const revalidate = 0

export default async function CurrentTripPage() {
  const active = await getActiveTrip()
  const [trip, currentOdometer] = await Promise.all([
    active ? getTripDetail(active.id) : null,
    getCurrentOdometer(),
  ])

  const km = trip ? Math.max(0, (currentOdometer || trip.start_odometer) - trip.start_odometer) : 0
  const fuelTotal = trip?.fuel_logs?.reduce((sum, item) => sum + item.amount, 0) ?? 0
  const lpgTotal = trip?.lpg_logs?.reduce((sum, item) => sum + item.amount, 0) ?? 0
  const maintenanceTotal = trip?.maintenance_logs?.reduce((sum, item) => sum + (item.cost ?? 0), 0) ?? 0
  const dailyTotal = trip?.daily_logs?.reduce(
    (sum, item) => sum + (item.accommodation_cost ?? 0) + (item.daily_expenses ?? 0),
    0
  ) ?? 0
  const totalCost = fuelTotal + lpgTotal + maintenanceTotal + dailyTotal
  const durationDays = trip ? Math.max(1, trip.daily_logs?.length ?? 0) : 0
  const timeline = [
    ...(trip?.daily_logs ?? []).map((log) => ({
      id: `daily-${log.id}`,
      date: String(log.date).slice(0, 10),
      icon: CalendarDays,
      title: log.location_name || 'Registro diario',
      text: [
        log.notes || 'Sin notas',
        log.stops?.length ? log.stops.map((stop) => stop.name).join(' → ') : null,
      ].filter(Boolean).join(' · '),
    })),
    ...(trip?.fuel_logs ?? []).map((log) => ({
      id: `fuel-${log.id}`,
      date: String(log.date).slice(0, 10),
      icon: Fuel,
      title: `${log.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € gasolina`,
      text: log.station_name || `${log.price_per_liter.toFixed(3)} €/L`,
    })),
    ...(trip?.lpg_logs ?? []).map((log) => ({
      id: `lpg-${log.id}`,
      date: String(log.date).slice(0, 10),
      icon: Flame,
      title: `${log.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € GLP`,
      text: `${log.quantity.toFixed(2)} ${log.unit === 'liters' ? 'L' : 'kg'}${log.place_name ? ` · ${log.place_name}` : ''}`,
    })),
    ...(trip?.maintenance_logs ?? []).map((log) => ({
      id: `maintenance-${log.id}`,
      date: String(log.date).slice(0, 10),
      icon: Wrench,
      title: log.description,
      text: log.cost ? `${log.cost.toFixed(2)} €` : 'sin coste',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const timelineCount = timeline.length

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Viaje actual</p>
        <h1>{trip ? `${trip.start_location || 'Salida'} en curso` : 'No hay viaje activo'}</h1>
        <p>{trip ? 'Modo concentrado para registrar lo importante mientras estas en ruta.' : 'Inicia un viaje desde Ruta para activar esta pantalla y empezar a guardar diario, repostajes y tareas asociadas.'}</p>
        <div className={styles.actions}>
          {trip ? (
            <>
              <Link href="/daily" className={styles.primary}><Plus size={16} /> Registrar día</Link>
              <Link href="/fuel" className={styles.secondary}><Fuel size={16} /> Repostaje</Link>
              <Link href="/maintenance" className={styles.secondary}><Wrench size={16} /> Taller</Link>
            </>
          ) : (
            <>
              <Link href="/odometer" className={styles.primary}><Route size={16} /> Iniciar viaje</Link>
              <Link href="/daily" className={styles.secondary}><Plus size={16} /> Registrar día</Link>
            </>
          )}
        </div>
      </header>

      <section className={styles.metrics}>
        <div><span>Km viaje</span><strong>{km.toLocaleString('es-ES')}</strong></div>
        <div><span>Días</span><strong>{durationDays}</strong></div>
        <div><span>Coste viaje</span><strong>{totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
        <div><span>Gasolina</span><strong>{fuelTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
        <div><span>GLP</span><strong>{lpgTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
        <div><span>Eventos</span><strong>{timelineCount}</strong></div>
      </section>

      <LiveTripConsole activeTripId={trip?.id ?? null} startLocation={trip?.start_location || 'Pendiente de definir'} />

      <section className={styles.timeline}>
        <div className={styles.sectionHead}>
          <h2>Timeline rapido</h2>
          {trip && <Link href={`/trips/${trip.id}`}>Ver detalle completo</Link>}
        </div>
        {!trip && (
          <div className={styles.emptyPanel}>
            <Navigation size={18} />
            <div>
              <strong>Sin viaje activo todavía</strong>
              <span>Cuando inicies un viaje, aquí aparecerán los registros diarios, repostajes, taller y ubicaciones de esa ruta.</span>
            </div>
            <Link href="/odometer">Ir a Ruta</Link>
          </div>
        )}
        {trip && timelineCount === 0 && (
          <div className={styles.emptyPanel}>
            <CalendarDays size={18} />
            <div>
              <strong>Viaje activo sin eventos</strong>
              <span>Añade el primer registro diario o repostaje para construir el timeline del viaje.</span>
            </div>
            <Link href="/daily">Registrar día</Link>
          </div>
        )}
        {timeline.slice(0, 10).map((event) => {
          const Icon = event.icon
          return (
            <article key={event.id} className={styles.timelineItem}>
              <Icon size={16} />
              <div>
                <strong>{event.title}</strong>
                <span>{event.date} · {event.text}</span>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
