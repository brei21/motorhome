import { getStatsByStatus, getWaterStats, getLatestLocation, getTotalAccommodationCost } from '@/app/actions/daily-records'
import { getTotalKilometers } from '@/app/actions/odometer-records'
import { getTotalMaintenanceCost } from '@/app/actions/maintenance-records'
import { getTotalFuelCost } from '@/app/actions/fuel-records'
import { MapPin, Navigation, CalendarCheck, FileText, Droplets } from 'lucide-react'
import { getHeroImage } from '@/utils/placeholder'
import MapWrapper from '@/components/MapWrapper'
import WeatherWidget from '@/components/WeatherWidget'
import Link from 'next/link'
import styles from './page.module.css'

export const revalidate = 0

export default async function Dashboard() {
  const [
    dailyStats,
    waterStats,
    latestLocation,
    totalAccommodation,
    totalKm,
    totalMaintenance,
    totalFuel
  ] = await Promise.all([
    getStatsByStatus(),
    getWaterStats(),
    getLatestLocation(),
    getTotalAccommodationCost(),
    getTotalKilometers(),
    getTotalMaintenanceCost(),
    getTotalFuelCost()
  ])

  const totalBudget = totalFuel + totalAccommodation
  const heroImage = getHeroImage()

  return (
    <div className={styles.container}>
      
      <div className={styles.bentoGrid}>
        
        {/* LEFT COLUMN: HERO (Map) + UBICACIÓN */}
        <div className={styles.leftCol}>
          {/* MAP WIDGET / HERO (Now larger and dominant) */}
          <div className={`${styles.bentoItem} ${styles.heroCard} animate-slide-up`} style={{ animationDelay: '0.1s', backgroundImage: heroImage }}>
            <div className={styles.heroOverlay}>
              <div className={styles.heroHeader}>
                  <span className={styles.heroBadge}><Navigation size={14} /> Viaje Actual</span>
              </div>
              
              <div className={styles.heroContent} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                  <MapWrapper lat={latestLocation.lat} lng={latestLocation.lng} zoom={13} />
              </div>

              <div className={styles.heroFooter} style={{ zIndex: 10, position: 'relative', marginTop: 'auto', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))', margin: '-24px', padding: '100px 24px 24px 24px' }}>
                  <h1 className="text-title-1" style={{ color: 'white' }}>¡Hola Pablo! 👋</h1>
                  <p className="text-body" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Motorhome Location Tracker
                  </p>
              </div>
            </div>
          </div>

          {/* WEATHER/LOCATION CARD (Purple) */}
          <div className={`${styles.bentoItem} ${styles.purpleLightCard} animate-slide-up`} style={{ animationDelay: '0.35s' }}>
            <div className={styles.cardTop}>
              <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={18}/> UBICACIÓN</span>
            </div>
            <WeatherWidget lat={latestLocation.lat} lng={latestLocation.lng} />
          </div>
        </div>

        {/* RIGHT COLUMN: STATS AND LISTS */}
        <div className={styles.rightCol}>
          
          <div className={styles.statsRowGrid}>
            {/* BUDGET & SPEND CARD */}
            <div className={`${styles.bentoItem} bento-card animate-slide-up`} style={{ animationDelay: '0.15s' }}>
              <div className={styles.cardTop}>
                <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18}/> GASTOS</span>
              </div>
              
              <div className={styles.budgetStats}>
                <div className={styles.budgetPill}>TOTAL <strong>{totalBudget.toFixed(0)}€</strong></div>
                <div className={styles.graphContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <div className={styles.donut} style={{ background: `conic-gradient(var(--bento-green) ${(totalFuel/totalBudget)*100}%, var(--bento-yellow) 0)` }}>
                    <div className={styles.donutHole}>
                      <span className="text-title-3">{((totalFuel/totalBudget)*100 || 0).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--bento-green)' }} />
                       <span className="text-subhead" style={{ color: 'var(--text-secondary)' }}>Gasolina</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--bento-yellow)' }} />
                       <span className="text-subhead" style={{ color: 'var(--text-secondary)' }}>Alojamiento</span>
                      </div>
                  </div>
                </div>
              </div>
            </div>

            {/* READINESS / TOTAL KM CARD (Yellow) */}
            <div className={`${styles.bentoItem} ${styles.yellowCard} animate-slide-up`} style={{ animationDelay: '0.25s' }}>
              <div className={styles.cardTop}>
                <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarCheck size={18}/> KILÓMETROS</span>
              </div>
              <div className={styles.readinessContainer}>
                <div className={styles.readinessRing}>
                  <div className={styles.readinessInner}>
                    <span className="text-subhead" style={{ color: 'var(--text-primary)'}}>Total Recorrido</span>
                    <span className="text-title-1" style={{ fontSize: '28px', lineHeight: '32px' }}>{totalKm}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.listsRowGrid}>
            {/* ESTADO HOY (Dark Purple) */}
            <div className={`${styles.bentoItem} ${styles.purpleDarkCard} animate-slide-up`} style={{ animationDelay: '0.4s' }}>
              <div className={styles.cardTop}>
                <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}><Navigation size={18}/> ESTADO HOY</span>
              </div>
              <div className={styles.travelList}>
                <div className={styles.travelItem}>
                  <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)'}}>Gasolina</span>
                  <span className="text-body" style={{ color: 'white'}}>{(totalFuel).toFixed(0)}€</span>
                </div>
                <div className={styles.travelItem}>
                  <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)'}}>Días Parking</span>
                  <span className="text-body" style={{ color: 'white'}}>{dailyStats.parking}</span>
                </div>
                <div className={styles.travelItem} style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                  <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} color="var(--accent-blue)"/> Limpias</span>
                  <span className="text-body" style={{ color: 'white'}}>Hace {waterStats.fresh_water}d</span>
                </div>
                <div className={styles.travelItem}>
                  <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)'}}>Vaciado Grises</span>
                  <span className="text-body" style={{ color: 'white'}}>Hace {waterStats.grey_water}d</span>
                </div>
                <div className={styles.travelItem}>
                  <span className="text-subhead" style={{ color: 'rgba(255,255,255,0.7)'}}>Vaciado Negras</span>
                  <span className="text-body" style={{ color: 'white'}}>Hace {waterStats.black_water}d</span>
                </div>
              </div>
            </div>

            {/* PACKING LIST / TODO CARD (Dark) */}
            <div className={`${styles.bentoItem} bento-card-dark animate-slide-up`} style={{ animationDelay: '0.45s', gridRow: 'span 2' }}>
              <div className={styles.cardTop}>
                <span className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18}/> MANTENIMIENTO</span>
              </div>
              <div className={styles.todoList}>
                <label className={styles.todoItem}>
                  <input type="radio" name="todo" />
                  <div className={styles.todoTexts}>
                    <span className="text-body">Revisión de Gas</span>
                    <span className="text-subhead">Quedan 20 días</span>
                  </div>
                </label>
                <label className={styles.todoItem}>
                  <input type="radio" name="todo" />
                  <div className={styles.todoTexts}>
                    <span className="text-body">Batería Habitáculo</span>
                    <span className="text-subhead">Quedan 3 meses</span>
                  </div>
                </label>
              </div>
          </div>
          </div>

        </div>

      </div>
    </div>
  )
}
