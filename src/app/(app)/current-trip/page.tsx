import Link from 'next/link'
import { CalendarDays, Fuel, Navigation, Plus, Route, Wrench } from 'lucide-react'
import { getActiveTrip, getTripDetail } from '@/app/actions/trips'
import { getCurrentOdometer } from '@/app/actions/odometer-records'
import { CurrentLocationCard } from './CurrentLocationCard'
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
  const maintenanceTotal = trip?.maintenance_logs?.reduce((sum, item) => sum + (item.cost ?? 0), 0) ?? 0
  const dailyTotal = trip?.daily_logs?.reduce(
    (sum, item) => sum + (item.accommodation_cost ?? 0) + (item.daily_expenses ?? 0),
    0
  ) ?? 0
  const timelineCount = (trip?.daily_logs?.length ?? 0) + (trip?.fuel_logs?.length ?? 0) + (trip?.maintenance_logs?.length ?? 0)

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
        <div><span>Diario</span><strong>{trip?.daily_logs?.length ?? 0}</strong></div>
        <div><span>Coste viaje</span><strong>{(fuelTotal + maintenanceTotal + dailyTotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
      </section>

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
        {trip?.daily_logs?.map((log) => (
          <article key={log.id} className={styles.timelineItem}>
            <CalendarDays size={16} />
            <div>
              <strong>{log.location_name || 'Registro diario'}</strong>
              <span>{log.date} · {log.notes || 'Sin notas'}</span>
            </div>
          </article>
        ))}
        {trip?.fuel_logs?.map((log) => (
          <article key={log.id} className={styles.timelineItem}>
            <Fuel size={16} />
            <div>
              <strong>{log.amount.toFixed(2)} € en combustible</strong>
              <span>{log.date} · {log.station_name || 'Sin gasolinera'}</span>
            </div>
          </article>
        ))}
        {trip?.maintenance_logs?.map((log) => (
          <article key={log.id} className={styles.timelineItem}>
            <Wrench size={16} />
            <div>
              <strong>{log.description}</strong>
              <span>{log.date} · {log.cost ? `${log.cost.toFixed(2)} €` : 'sin coste'}</span>
            </div>
          </article>
        ))}
      </section>

      <CurrentLocationCard initialLocation={trip?.start_location || 'Pendiente de definir'} />
    </div>
  )
}
