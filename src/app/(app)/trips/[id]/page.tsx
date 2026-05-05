import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, CircleDot, Flame, Fuel, MapPin, Navigation, Wrench } from 'lucide-react'
import { getTripDetail } from '@/app/actions/trips'
import styles from './page.module.css'

export const revalidate = 0

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripDetail(id)

  if (!trip) notFound()

  const fuel = trip.fuel_logs?.reduce((sum, record) => sum + record.amount, 0) ?? 0
  const lpg = trip.lpg_logs?.reduce((sum, record) => sum + record.amount, 0) ?? 0
  const maintenance = trip.maintenance_logs?.reduce((sum, record) => sum + (record.cost ?? 0), 0) ?? 0
  const lodging = trip.daily_logs?.reduce(
    (sum, record) => sum + (record.accommodation_cost ?? 0) + (record.daily_expenses ?? 0),
    0
  ) ?? 0
  const km = trip.end_odometer ? trip.end_odometer - trip.start_odometer : null
  const totalCost = fuel + lpg + maintenance + lodging
  const startDate = new Date(trip.started_at)
  const endDate = trip.ended_at ? new Date(trip.ended_at) : new Date()
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1)
  const formatMoney = (value: number) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

  const timeline = [
    ...(trip.daily_logs ?? []).map((item) => ({
      id: `daily-${item.id}`,
      date: item.date.slice(0, 10),
      icon: CalendarDays,
      kind: 'Diario',
      title: item.location_name || 'Registro diario',
      text: [
        item.notes || item.status,
        item.stops?.length ? item.stops.map((stop) => `${stop.name}`).join(' → ') : null,
        item.visited_places?.length ? `Visitado: ${item.visited_places.join(', ')}` : null,
      ].filter(Boolean).join(' · '),
    })),
    ...(trip.fuel_logs ?? []).map((item) => ({
      id: `fuel-${item.id}`,
      date: item.date.slice(0, 10),
      icon: Fuel,
      kind: 'Gasolina',
      title: formatMoney(item.amount),
      text: `${item.price_per_liter.toFixed(3)} €/L${item.odometer_at ? ` · ${item.odometer_at.toLocaleString('es-ES')} km` : ''}${item.station_name ? ` · ${item.station_name}` : ''}`,
    })),
    ...(trip.lpg_logs ?? []).map((item) => ({
      id: `lpg-${item.id}`,
      date: item.date.slice(0, 10),
      icon: Flame,
      kind: 'GLP',
      title: formatMoney(item.amount),
      text: `${item.quantity.toFixed(2)} ${item.unit === 'liters' ? 'L' : 'kg'}${item.price_per_unit ? ` · ${item.price_per_unit.toFixed(3)} €/${item.unit === 'liters' ? 'L' : 'kg'}` : ''}${item.place_name ? ` · ${item.place_name}` : ''}`,
    })),
    ...(trip.maintenance_logs ?? []).map((item) => ({
      id: `maintenance-${item.id}`,
      date: item.date.slice(0, 10),
      icon: Wrench,
      kind: 'Taller',
      title: item.description,
      text: item.cost ? `${formatMoney(item.cost)} · ${item.type}` : item.type,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const groupedTimeline = timeline.reduce<Record<string, typeof timeline>>((acc, event) => {
    acc[event.date] = acc[event.date] ?? []
    acc[event.date].push(event)
    return acc
  }, {})
  const mapPoints = (trip.daily_logs ?? [])
    .filter((log) => log.latitude && log.longitude)
    .map((log) => ({
      id: log.id,
      date: log.date.slice(0, 10),
      label: log.location_name || `${log.latitude}, ${log.longitude}`,
      latitude: log.latitude,
      longitude: log.longitude,
    }))

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
        <div><span>Coste total</span><strong>{formatMoney(totalCost)}</strong></div>
        <div><span>Días</span><strong>{days}</strong></div>
        <div><span>Coste/día</span><strong>{formatMoney(totalCost / days)}</strong></div>
        <div><span>Coste/km</span><strong>{km && km > 0 ? `${(totalCost / km).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/km` : '—'}</strong></div>
        <div><span>Registros</span><strong>{timeline.length}</strong></div>
      </section>

      <section className={styles.mapBox}>
        <Navigation size={20} />
        <div>
          <strong>Mapa del viaje</strong>
          <span>{mapPoints.length} puntos GPS registrados en la bitácora.</span>
          {mapPoints.length > 0 && (
            <div className={styles.mapPointGrid}>
              {mapPoints.map((point, index) => (
                <span key={point.id}>
                  <MapPin size={13} />
                  {index + 1}. {point.label} · {point.date} · {point.latitude}, {point.longitude}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.timeline}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Bitácora de viaje</p>
            <h2>Timeline agrupado por día</h2>
          </div>
          <span>{Object.keys(groupedTimeline).length} días con actividad</span>
        </div>
        {timeline.length === 0 ? (
          <div className={styles.empty}>Todavía no hay eventos asociados a este viaje.</div>
        ) : Object.entries(groupedTimeline).map(([date, events]) => (
          <div key={date} className={styles.dayGroup}>
            <div className={styles.dayHeader}>
              <CircleDot size={16} />
              <strong>{date}</strong>
              <span>{events.length} eventos</span>
            </div>
            {events.map((event) => {
              const Icon = event.icon
              return (
                <article key={event.id} className={styles.timelineItem}>
                  <Icon size={16} />
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.kind} · {event.text}</span>
                  </div>
                </article>
              )
            })}
          </div>
        ))}
      </section>
    </div>
  )
}
