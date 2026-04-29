import { NextResponse } from 'next/server'
import { clearFailedLoginAttempts, getLoginThrottleState, normalizePin, registerFailedLoginAttempt, verifyConfiguredPin } from '@/lib/auth/pin'
import { createSessionToken, setAuthSessionCookie } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const throttle = await getLoginThrottleState(request)

    if (throttle.limited) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many attempts. Try again later.',
          retryAfterSeconds: throttle.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const body = await request.json().catch(() => null)
    const pin = normalizePin(body?.pin)
    const isValid = await verifyConfiguredPin(pin)

    if (isValid) {
      await clearFailedLoginAttempts(request)

      const response = NextResponse.json(
        { success: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )

      setAuthSessionCookie(response, await createSessionToken())
      return response
    }

    const failure = await registerFailedLoginAttempt(request)
    await new Promise((resolve) => setTimeout(resolve, 350))

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid credentials.',
        retryAfterSeconds: failure.retryAfterSeconds,
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
