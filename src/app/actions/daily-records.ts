'use server'

import { revalidatePath } from 'next/cache'

export type DailyRecordStatus = 'travel' | 'parking' | 'vacation_home'

export interface DailyRecord {
  id: string
  date: string
  status: DailyRecordStatus
  latitude: number | null
  longitude: number | null
  location_name: string | null
  notes: string | null
  accommodation_cost: number | null
  grey_water_emptied: boolean
  black_water_emptied: boolean
  fresh_water_filled: boolean
  created_at: string
}

const globalAny: any = global
if (!globalAny.mockLocation) {
  globalAny.mockLocation = { lat: 41.3851, lng: 2.1734 }
}
if (!globalAny.mockTotalAccommodation) {
  globalAny.mockTotalAccommodation = 346
}

export async function createDailyRecord(data: {
  date: string
  status: DailyRecordStatus
  latitude?: number | null
  longitude?: number | null
  location_name?: string | null
  notes?: string | null
  accommodation_cost?: number | null
  grey_water_emptied?: boolean
  black_water_emptied?: boolean
  fresh_water_filled?: boolean
}) {
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 800))

  if (data.latitude && data.longitude) {
    globalAny.mockLocation = { lat: data.latitude, lng: data.longitude }
  }

  // Accumulate accommodation cost
  if (data.accommodation_cost && data.accommodation_cost > 0) {
    globalAny.mockTotalAccommodation = (globalAny.mockTotalAccommodation || 0) + data.accommodation_cost
  }

  revalidatePath('/')
  return { ...data, id: 'mock-1', created_at: new Date().toISOString() } as DailyRecord
}

export async function getDailyRecords(limit = 30) {
  return [] as DailyRecord[]
}

export async function getStatsByStatus() {
  return { travel: 12, parking: 4, vacation_home: 2 }
}

export async function getWaterStats() {
  return {
    grey_water: 3,
    black_water: 2,
    fresh_water: 4
  }
}

export async function getLatestLocation() {
  return globalAny.mockLocation as { lat: number, lng: number }
}

export async function getTotalAccommodationCost() {
  return (globalAny.mockTotalAccommodation || 346) as number
}
