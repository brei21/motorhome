/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from 'react'
import { startTrip as startTripAction, endTrip as endTripAction } from '@/app/actions/trips'

export type TripState = {
  id?: string
  startedAt: string // ISO
  startOdometer: number
  startLocation?: { name?: string; lat?: number; lng?: number }
  endedAt?: string // ISO
  endOdometer?: number
  notes?: string
}

const STORAGE_KEY = 'motorhome_trip_active'

export function useTrip() {
  const [trip, setTrip] = useState<TripState | null>(null)
  const [ready, setReady] = useState(false)

  const persist = (value: TripState | null) => {
    setTrip(value)
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as TripState
        // defer state to avoid hydration lint rule
        setTimeout(() => setTrip(parsed), 0)
      }
    } catch {}
    setTimeout(() => setReady(true), 0)
  }, [])

  const startTrip = (payload: { startOdometer: number; startLocation?: TripState['startLocation']; notes?: string }) => {
    const next: TripState = {
      startedAt: new Date().toISOString(),
      startOdometer: payload.startOdometer,
      startLocation: payload.startLocation,
      notes: payload.notes,
    }
    persist(next)
  }

  const endTrip = (payload: { endOdometer: number; notes?: string; endLocation?: TripState['startLocation'] }) => {
    if (!trip) return
    const next: TripState = {
      ...trip,
      endedAt: new Date().toISOString(),
      endOdometer: payload.endOdometer,
      notes: payload.notes ?? trip.notes,
    }
    persist(next)
    return next
  }

  const clearTrip = () => persist(null)

  const isActive = !!trip && !trip.endedAt

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!trip || trip.endedAt) return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [trip])

  const elapsedMs = useMemo(() => {
    if (!trip) return 0
    const start = new Date(trip.startedAt).getTime()
    const end = trip.endedAt ? new Date(trip.endedAt).getTime() : now
    return end - start
  }, [trip, now])

  return {
    ready,
    trip,
    isActive,
    startTrip: async (payload: { startOdometer: number; startLocation?: TripState['startLocation']; notes?: string }) => {
      const dbTrip = await startTripAction({
        start_odometer: payload.startOdometer,
        start_location: payload.startLocation?.name ?? null,
        notes: payload.notes ?? null,
      })
      const next: TripState = {
        id: dbTrip.id,
        startedAt: dbTrip.started_at,
        startOdometer: dbTrip.start_odometer,
        startLocation: { name: dbTrip.start_location ?? undefined },
        notes: dbTrip.notes ?? undefined,
      }
      persist(next)
      return next
    },
    endTrip: async (payload: { endOdometer: number; notes?: string; endLocation?: TripState['startLocation'] }) => {
      if (!trip?.id) return
      const dbTrip = await endTripAction({
        trip_id: trip.id,
        end_odometer: payload.endOdometer,
        end_location: payload.endLocation?.name ?? null,
        notes: payload.notes ?? null,
      })
      const next: TripState = {
        id: dbTrip.id,
        startedAt: dbTrip.started_at,
        startOdometer: dbTrip.start_odometer,
        startLocation: { name: dbTrip.start_location ?? undefined },
        endedAt: dbTrip.ended_at ?? undefined,
        endOdometer: dbTrip.end_odometer ?? undefined,
        notes: dbTrip.notes ?? undefined,
      }
      persist(next)
      return next
    },
    clearTrip,
    elapsedMs,
  }
}
