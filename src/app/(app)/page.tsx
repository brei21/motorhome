import DashboardClient from '@/components/DashboardClient'
import { getDailyRecords } from '@/app/actions/daily-records'
import { getFuelRecords } from '@/app/actions/fuel-records'
import { getLpgRecords } from '@/app/actions/lpg-records'
import { getMaintenanceRecords } from '@/app/actions/maintenance-records'
import { getCurrentOdometer } from '@/app/actions/odometer-records'
import { getActiveTrip, listTrips } from '@/app/actions/trips'
import { getVehicleDocuments, getVehicleProfile } from '@/app/actions/vehicle'

export const revalidate = 0

export default async function Dashboard() {
  const [activeTrip, trips, dailyLogs, fuelLogs, lpgLogs, maintenanceLogs, currentOdometer, vehicleProfile, vehicleDocuments] =
    await Promise.all([
      getActiveTrip(),
      listTrips(20),
      getDailyRecords(60),
      getFuelRecords(),
      getLpgRecords(),
      getMaintenanceRecords(),
      getCurrentOdometer(),
      getVehicleProfile(),
      getVehicleDocuments(),
    ])

  const totalFuel = fuelLogs.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
  const totalLpg = lpgLogs.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
  const totalMaintenance = maintenanceLogs.reduce(
    (sum, record) => sum + (record.cost ? Number(record.cost) : 0),
    0
  )

  return (
    <DashboardClient
      initialData={{
        activeTrip,
        trips,
        dailyLogs,
        fuelLogs,
        lpgLogs,
        maintenanceLogs,
        vehicleProfile,
        vehicleDocuments,
        currentOdometer,
        totals: {
          fuel: totalFuel,
          lpg: totalLpg,
          maintenance: totalMaintenance,
          daily: 0,
          overall: totalFuel + totalLpg + totalMaintenance,
        },
      }}
    />
  )
}
