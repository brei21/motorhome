import TopNavigation from '@/components/TopNavigation'
import BottomNavigation from '@/components/BottomNavigation'

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

      <BottomNavigation />
    </>
  )
}
