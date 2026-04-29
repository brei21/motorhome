import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { changeConfiguredPin, normalizePin } from '@/lib/auth/pin'
import { getPinPolicyLabel } from '@/lib/auth/policy'
import { AUTH_COOKIE_NAME, createSessionToken, setAuthSessionCookie, verifySessionToken } from '@/lib/auth/session'
import { writeAuditLog } from '@/app/actions/audit'

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    const session = token ? await verifySessionToken(token) : null

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const body = await request.json().catch(() => null)
    const currentPin = normalizePin(body?.currentPin)
    const newPin = normalizePin(body?.newPin)
    const confirmPin = normalizePin(body?.confirmPin)

    if (newPin !== confirmPin) {
      return NextResponse.json(
        { success: false, error: 'New PIN confirmation does not match.' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const result = await changeConfiguredPin(currentPin, newPin)

    if (!result.success) {
      const errorByCode = {
        CURRENT_PIN_INVALID: `Current PIN must be ${getPinPolicyLabel()}.`,
        NEW_PIN_INVALID: `New PIN must be ${getPinPolicyLabel()}.`,
        CURRENT_PIN_MISMATCH: 'Current PIN is incorrect.',
        PIN_REUSE: 'Choose a different PIN.',
      } as const

      const statusByCode = {
        CURRENT_PIN_INVALID: 400,
        NEW_PIN_INVALID: 400,
        CURRENT_PIN_MISMATCH: 401,
        PIN_REUSE: 400,
      } as const

      return NextResponse.json(
        { success: false, error: errorByCode[result.code] },
        {
          status: statusByCode[result.code],
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const response = NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )

    setAuthSessionCookie(response, await createSessionToken())
    await writeAuditLog({ action: 'pin.changed', entity: 'auth_settings' })
    return response
  } catch (error) {
    console.error('PIN update failed:', error)
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
