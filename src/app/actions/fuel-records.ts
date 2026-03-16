'use server'

import { revalidatePath } from 'next/cache'

export interface FuelRecord {
  id: string
  date: string
  amount: number
  price_per_liter: number
  created_at: string
}

export async function createFuelRecord(data: {
  date: string
  amount: number
  price_per_liter: number
}) {
  await new Promise(resolve => setTimeout(resolve, 800))
  revalidatePath('/')
  revalidatePath('/fuel')
  return { ...data, id: 'mock-1', created_at: new Date().toISOString() } as FuelRecord
}

export async function getFuelRecords(limit = 20) {
  return [] as FuelRecord[]
}

export async function getTotalFuelCost() {
  return 1240.25
}
