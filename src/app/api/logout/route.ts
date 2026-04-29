import { NextResponse } from 'next/server'
import { clearAuthSessionCookie } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )

  clearAuthSessionCookie(response)
  return response
}
