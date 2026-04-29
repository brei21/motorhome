import { NextResponse } from 'next/server'
import { getDailyRecords } from '@/app/actions/daily-records'
import { getFuelRecords } from '@/app/actions/fuel-records'
import { getMaintenanceRecords } from '@/app/actions/maintenance-records'
import { getCurrentOdometer } from '@/app/actions/odometer-records'
import { getActiveTrip, listTrips } from '@/app/actions/trips'
import { getVehicleDocuments, getVehicleProfile } from '@/app/actions/vehicle'

export async function GET() {
  const [activeTrip, trips, dailyLogs, fuelLogs, maintenanceLogs, currentOdometer, vehicleProfile, vehicleDocuments] =
    await Promise.all([
      getActiveTrip(),
      listTrips(20),
      getDailyRecords(60),
      getFuelRecords(),
      getMaintenanceRecords(),
      getCurrentOdometer(),
      getVehicleProfile(),
      getVehicleDocuments(),
    ])

  const totalFuel = fuelLogs.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
  const totalMaintenance = maintenanceLogs.reduce(
    (sum, record) => sum + (record.cost ? Number(record.cost) : 0),
    0
  )

  return NextResponse.json({
    activeTrip,
    trips,
    dailyLogs,
    fuelLogs,
    maintenanceLogs,
    vehicleProfile,
    vehicleDocuments,
    currentOdometer,
    totals: {
      fuel: totalFuel,
      maintenance: totalMaintenance,
      overall: totalFuel + totalMaintenance,
    },
  })
}
