import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Fuel, Navigation, Wrench } from 'lucide-react'
import { getTripDetail } from '@/app/actions/trips'
import styles from './page.module.css'

export const revalidate = 0

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripDetail(id)

  if (!trip) notFound()

  const fuel = trip.fuel_logs?.reduce((sum, record) => sum + record.amount, 0) ?? 0
  const maintenance = trip.maintenance_logs?.reduce((sum, record) => sum + (record.cost ?? 0), 0) ?? 0
  const lodging = trip.daily_logs?.reduce(
    (sum, record) => sum + (record.accommodation_cost ?? 0) + (record.daily_expenses ?? 0),
    0
  ) ?? 0
  const km = trip.end_odometer ? trip.end_odometer - trip.start_odometer : null

  const timeline = [
    ...(trip.daily_logs ?? []).map((item) => ({
      id: `daily-${item.id}`,
      date: item.date,
      icon: CalendarDays,
      title: item.location_name || 'Registro diario',
      text: [
        item.notes || item.status,
        item.visited_places?.length ? `Visitado: ${item.visited_places.join(', ')}` : null,
      ].filter(Boolean).join(' · '),
    })),
    ...(trip.fuel_logs ?? []).map((item) => ({
      id: `fuel-${item.id}`,
      date: item.date,
      icon: Fuel,
      title: `${item.amount.toFixed(2)} € combustible`,
      text: item.station_name || `${item.price_per_liter.toFixed(3)} €/L`,
    })),
    ...(trip.maintenance_logs ?? []).map((item) => ({
      id: `maintenance-${item.id}`,
      date: item.date,
      icon: Wrench,
      title: item.description,
      text: item.cost ? `${item.cost.toFixed(2)} €` : item.type,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className={styles.page}>
      <Link href="/odometer" className={styles.back}>← Volver a ruta</Link>
      <header className={styles.header}>
        <p className={styles.kicker}>Detalle de viaje</p>
        <h1>{trip.start_location || 'Salida'} {trip.end_location ? `→ ${trip.end_location}` : ''}</h1>
        <p>{trip.started_at.slice(0, 10)} {trip.ended_at ? `· ${trip.ended_at.slice(0, 10)}` : '· en curso'}</p>
      </header>

      <section className={styles.metrics}>
        <div><span>Kilómetros</span><strong>{km === null ? '—' : km.toLocaleString('es-ES')}</strong></div>
        <div><span>Coste total</span><strong>{(fuel + maintenance + lodging).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
        <div><span>Registros</span><strong>{timeline.length}</strong></div>
      </section>

      <section className={styles.mapBox}>
        <Navigation size={20} />
        <div>
          <strong>Mapa del viaje</strong>
          <span>{trip.daily_logs?.filter((log) => log.latitude && log.longitude).length ?? 0} puntos GPS registrados en la bitácora.</span>
        </div>
      </section>

      <section className={styles.timeline}>
        <h2>Timeline unificado</h2>
        {timeline.length === 0 ? (
          <div className={styles.empty}>Todavía no hay eventos asociados a este viaje.</div>
        ) : timeline.map((event) => {
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
