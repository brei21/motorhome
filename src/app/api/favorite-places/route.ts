import { NextResponse } from 'next/server'
import { createFavoritePlace, deleteFavoritePlace, listFavoritePlaces, type FavoritePlaceType } from '@/app/actions/favorite-places'

export async function GET() {
  const places = await listFavoritePlaces()
  return NextResponse.json(places)
}

export async function POST(request: Request) {
  const payload = await request.json()
  const name = String(payload.name || '').trim()

  if (!name) {
    return NextResponse.json(
      { success: false, error: 'Nombre requerido.' },
      { status: 400 }
    )
  }

  const place = await createFavoritePlace({
    name,
    type: (payload.type || 'other') as FavoritePlaceType,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    notes: payload.notes ?? null,
  })
  return NextResponse.json(place)
}

export async function DELETE(request: Request) {
  const payload = await request.json()
  const id = String(payload.id || '').trim()

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID requerido.' }, { status: 400 })
  }

  await deleteFavoritePlace(id)
  return NextResponse.json({ success: true })
}
