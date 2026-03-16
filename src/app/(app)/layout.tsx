import TopNavigation from '@/components/TopNavigation'
import styles from './page.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TopNavigation />
      
      <main className="main-content">
        {children}
      </main>
    </>
  )
}
