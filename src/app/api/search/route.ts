import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

type SearchResult = {
  id: string
  type: string
  title: string
  subtitle: string | null
  date: string | null
  href: string
}

function normalizeSearchTerm(value: string | null) {
  return String(value || '').trim().slice(0, 80)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const term = normalizeSearchTerm(url.searchParams.get('q'))

  if (term.length < 2) {
    return NextResponse.json([])
  }

  const pattern = `%${term}%`
  const res = await query<SearchResult>(
    `
      SELECT * FROM (
        SELECT id::text, 'diario' AS type,
          COALESCE(location_name, 'Registro diario') AS title,
          CONCAT_WS(' · ', notes, daily_expenses_notes, array_to_string(visited_places, ', '), array_to_string(tags, ', ')) AS subtitle,
          date::text AS date,
          '/daily' AS href
        FROM daily_logs
        WHERE COALESCE(location_name, '') ILIKE $1
           OR COALESCE(notes, '') ILIKE $1
           OR COALESCE(daily_expenses_notes, '') ILIKE $1
           OR array_to_string(visited_places, ' ') ILIKE $1
           OR array_to_string(tags, ' ') ILIKE $1
           OR stops::text ILIKE $1
           OR daily_expense_breakdown::text ILIKE $1

        UNION ALL

        SELECT id::text, 'viaje' AS type,
          COALESCE(start_location, 'Viaje') AS title,
          CONCAT_WS(' → ', start_location, end_location) AS subtitle,
          started_at::date::text AS date,
          '/trips/' || id::text AS href
        FROM trips
        WHERE COALESCE(start_location, '') ILIKE $1
           OR COALESCE(end_location, '') ILIKE $1
           OR COALESCE(notes, '') ILIKE $1

        UNION ALL

        SELECT id::text, 'gasolina' AS type,
          COALESCE(station_name, 'Repostaje gasolina') AS title,
          amount::text || ' € · ' || price_per_liter::text || ' €/L' AS subtitle,
          date::text AS date,
          '/fuel' AS href
        FROM fuel_logs
        WHERE COALESCE(station_name, '') ILIKE $1
           OR amount::text ILIKE $1
           OR price_per_liter::text ILIKE $1

        UNION ALL

        SELECT id::text, 'glp' AS type,
          COALESCE(place_name, 'Registro GLP') AS title,
          CONCAT_WS(' · ', amount::text || ' €', quantity::text || ' ' || unit, usage_type, notes) AS subtitle,
          date::text AS date,
          '/lpg' AS href
        FROM lpg_logs
        WHERE COALESCE(place_name, '') ILIKE $1
           OR COALESCE(notes, '') ILIKE $1
           OR usage_type ILIKE $1

        UNION ALL

        SELECT id::text, 'taller' AS type,
          description AS title,
          CONCAT_WS(' · ', type, cost::text || ' €', odometer_at::text || ' km') AS subtitle,
          date::text AS date,
          '/maintenance' AS href
        FROM maintenance_logs
        WHERE description ILIKE $1
           OR type ILIKE $1

        UNION ALL

        SELECT id::text, 'favorito' AS type,
          name AS title,
          CONCAT_WS(' · ', type, notes) AS subtitle,
          created_at::date::text AS date,
          '/favorites' AS href
        FROM favorite_places
        WHERE name ILIKE $1
           OR type ILIKE $1
           OR COALESCE(notes, '') ILIKE $1

        UNION ALL

        SELECT id::text, 'vehiculo' AS type,
          title AS title,
          CONCAT_WS(' · ', type, document_url, notes) AS subtitle,
          COALESCE(expires_at::text, created_at::date::text) AS date,
          '/vehicle' AS href
        FROM vehicle_documents
        WHERE title ILIKE $1
           OR type ILIKE $1
           OR COALESCE(notes, '') ILIKE $1
      ) AS results
      ORDER BY date DESC NULLS LAST, title ASC
      LIMIT 40
    `,
    [pattern]
  )

  return NextResponse.json(res.rows)
}
