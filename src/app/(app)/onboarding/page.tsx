import Link from 'next/link'
import styles from './page.module.css'

const steps = [
  {
    href: '/vehicle',
    title: 'Configura la autocaravana',
    text: 'Guarda matrícula, modelo, ITV, seguro, neumáticos, aceite, gas y medidas. Esto activa alertas útiles en el dashboard.',
  },
  {
    href: '/odometer',
    title: 'Mete odómetro y ruta',
    text: 'El odómetro total alimenta mantenimientos, costes por km y viajes. Desde Ruta puedes iniciar o cerrar un viaje.',
  },
  {
    href: '/daily',
    title: 'Registra el primer día',
    text: 'Permite GPS, añade paradas del día, gastos y estado. Si estás de viaje, se enlaza con la bitácora del viaje activo.',
  },
]

export default function OnboardingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Primer arranque</p>
        <h1>Configura lo mínimo para que la app empiece a darte valor.</h1>
        <p>Este flujo evita pantallas vacías y deja preparada la base de datos antes de que el usuario final empiece a registrar viajes reales.</p>
        <div className={styles.ctaRow}>
          <Link href="/vehicle">Empezar por vehículo</Link>
          <Link href="/daily">Ir directo al diario</Link>
        </div>
      </section>

      <section className={styles.steps}>
        {steps.map((step, index) => (
          <Link key={step.href} href={step.href} className={styles.step}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
