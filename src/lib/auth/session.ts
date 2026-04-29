import { NextResponse } from 'next/server'

export const AUTH_COOKIE_NAME = 'motorhome_session'
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

interface SessionPayload {
  sub: 'motorhome'
  iat: number
  exp: number
}

const encoder = new TextEncoder()

function encodeBase64Url(value: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...value))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(`${normalized}${padding}`)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function encodeText(value: string) {
  return encodeBase64Url(encoder.encode(value))
}

function decodeText(value: string) {
  return new TextDecoder().decode(decodeBase64Url(value))
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim()

  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is required to sign auth sessions.')
  }

  if (secret.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must be at least 32 characters long.')
  }

  return secret
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signPayload(payloadSegment: string) {
  const signature = await crypto.subtle.sign('HMAC', await getHmacKey(), encoder.encode(payloadSegment))
  return encodeBase64Url(new Uint8Array(signature))
}

function getCookieOptions(maxAge = AUTH_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    priority: 'high' as const,
  }
}

export async function createSessionToken() {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: 'motorhome',
    iat: now,
    exp: now + AUTH_SESSION_MAX_AGE_SECONDS,
  }

  const payloadSegment = encodeText(JSON.stringify(payload))
  const signatureSegment = await signPayload(payloadSegment)
  return `${payloadSegment}.${signatureSegment}`
}

export async function verifySessionToken(token: string) {
  const [payloadSegment, signatureSegment, ...extra] = token.split('.')

  if (!payloadSegment || !signatureSegment || extra.length > 0) {
    return null
  }

  const isValid = await crypto.subtle.verify(
    'HMAC',
    await getHmacKey(),
    decodeBase64Url(signatureSegment),
    encoder.encode(payloadSegment)
  )

  if (!isValid) {
    return null
  }

  try {
    const payload = JSON.parse(decodeText(payloadSegment)) as Partial<SessionPayload>

    if (payload.sub !== 'motorhome' || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      return null
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload as SessionPayload
  } catch {
    return null
  }
}

export function setAuthSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, getCookieOptions())
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getCookieOptions(0),
    expires: new Date(0),
  })
}
