'use server'

import { revalidatePath } from 'next/cache'

export interface OdometerRecord {
  id: string
  date: string
  kilometers: number
  notes: string | null
  created_at: string
}

export async function createOdometerRecord(data: {
  date: string
  kilometers: number
  notes?: string | null
}) {
  await new Promise(resolve => setTimeout(resolve, 800))
  revalidatePath('/')
  revalidatePath('/odometer')
  return { ...data, id: 'mock-1', created_at: new Date().toISOString() } as OdometerRecord
}

export async function getOdometerRecords(limit = 20) {
  return []
}

export async function getTotalKilometers() {
  return 15234
}

export async function getCurrentOdometer() {
  return 42500
}
