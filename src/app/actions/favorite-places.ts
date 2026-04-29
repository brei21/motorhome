'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { writeAuditLog } from '@/app/actions/audit'

export type FavoritePlaceType = 'camping' | 'parking' | 'viewpoint' | 'workshop' | 'fuel' | 'other'

export interface FavoritePlace {
  id: string
  name: string
  type: FavoritePlaceType
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
}

export async function createFavoritePlace(data: {
  name: string
  type: FavoritePlaceType
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
}) {
  const res = await query<FavoritePlace>(
    `
      INSERT INTO favorite_places (name, type, latitude, longitude, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [data.name, data.type, data.latitude ?? null, data.longitude ?? null, data.notes ?? null]
  )

  revalidatePath('/odometer')
  await writeAuditLog({
    action: 'favorite_place.created',
    entity: 'favorite_places',
    entity_id: res.rows[0]?.id,
    metadata: { type: data.type },
  })
  return res.rows[0]
}

export async function listFavoritePlaces(limit = 50) {
  const res = await query<FavoritePlace>(
    `SELECT * FROM favorite_places ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return res.rows
}
