'use server'

import { revalidatePath } from 'next/cache'

export type MaintenanceType = 'repair' | 'improvement' | 'maintenance'

export interface MaintenanceRecord {
  id: string
  date: string
  type: MaintenanceType
  description: string
  cost: number | null
  created_at: string
}

export async function createMaintenanceRecord(data: {
  date: string
  type: MaintenanceType
  description: string
  cost?: number | null
}) {
  await new Promise(resolve => setTimeout(resolve, 800))
  revalidatePath('/')
  revalidatePath('/maintenance')
  return { ...data, id: 'mock-1', created_at: new Date().toISOString() } as MaintenanceRecord
}

export async function getMaintenanceRecords(limit = 20) {
  return [] as MaintenanceRecord[]
}

export async function getTotalMaintenanceCost() {
  return 345.50
}
