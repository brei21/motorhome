import 'server-only'

import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { query } from '@/lib/db'
import { getPinPolicyLabel, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '@/lib/auth/policy'

const PIN_HASH_PREFIX = 'pbkdf2_sha256'
const PBKDF2_ITERATIONS = 210_000
const PBKDF2_KEY_LENGTH = 32
const PIN_RECORD_ID = 1
const MAX_FAILED_ATTEMPTS = 5
const FAILURE_RESET_WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000

const pinPattern = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`)

let schemaReady: Promise<void> | null = null
let warnedAboutLegacyPin = false

interface AuthSettingsRow {
  id: number
  pin_hash: string
  created_at: string
  updated_at: string
}

interface RateLimitRow {
  attempt_key: string
  failure_count: number
  last_failed_at: string | null
  locked_until: string | null
}

export function normalizePin(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidPinFormat(pin: string) {
  return pinPattern.test(pin)
}

function ensureStoredHashFormat(pinHash: string) {
  const parts = pinHash.split('$')

  if (parts.length !== 4 || parts[0] !== PIN_HASH_PREFIX) {
    throw new Error('AUTH_PIN_HASH must use the pbkdf2_sha256$iterations$salt$hash format.')
  }

  const iterations = Number.parseInt(parts[1], 10)

  if (!Number.isFinite(iterations) || iterations < 100_000) {
    throw new Error('AUTH_PIN_HASH iterations must be a number >= 100000.')
  }

  if (!parts[2] || !parts[3]) {
    throw new Error('AUTH_PIN_HASH is missing salt or digest data.')
  }

  return {
    iterations,
    salt: parts[2],
    digest: parts[3],
  }
}

function hashPin(pin: string) {
  if (!isValidPinFormat(pin)) {
    throw new Error(`PIN must be ${getPinPolicyLabel()}.`)
  }

  const salt = randomBytes(16).toString('base64url')
  const digest = pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha256').toString('base64url')
  return `${PIN_HASH_PREFIX}$${PBKDF2_ITERATIONS}$${salt}$${digest}`
}

function verifyPinAgainstHash(pin: string, storedHash: string) {
  const { iterations, salt, digest } = ensureStoredHashFormat(storedHash)
  const candidateDigest = pbkdf2Sync(pin, salt, iterations, PBKDF2_KEY_LENGTH, 'sha256')
  const storedDigest = Buffer.from(digest, 'base64url')

  if (storedDigest.length !== candidateDigest.length) {
    return false
  }

  return timingSafeEqual(candidateDigest, storedDigest)
}

async function ensureAuthSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS auth_settings (
          id smallint PRIMARY KEY,
          pin_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS auth_login_attempts (
          attempt_key text PRIMARY KEY,
          failure_count integer NOT NULL DEFAULT 0,
          last_failed_at timestamptz,
          locked_until timestamptz
        )
      `)
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }

  await schemaReady
}

async function getStoredSettings() {
  await ensureAuthSchema()

  const result = await query<AuthSettingsRow>(
    `SELECT id, pin_hash, created_at, updated_at FROM auth_settings WHERE id = $1 LIMIT 1`,
    [PIN_RECORD_ID]
  )

  return result.rows[0] ?? null
}

async function bootstrapPinHash() {
  const configuredHash = process.env.AUTH_PIN_HASH?.trim()

  if (configuredHash) {
    ensureStoredHashFormat(configuredHash)
    return configuredHash
  }

  const bootstrapPin = normalizePin(process.env.AUTH_BOOTSTRAP_PIN) || normalizePin(process.env.MASTER_PIN)

  if (bootstrapPin) {
    if (!isValidPinFormat(bootstrapPin)) {
      throw new Error(`AUTH_BOOTSTRAP_PIN must be ${getPinPolicyLabel()}.`)
    }

    if (process.env.MASTER_PIN && !warnedAboutLegacyPin) {
      warnedAboutLegacyPin = true
      console.warn('MASTER_PIN is deprecated. Move to AUTH_BOOTSTRAP_PIN or AUTH_PIN_HASH.')
    }

    return hashPin(bootstrapPin)
  }

  throw new Error('No PIN configured. Set AUTH_BOOTSTRAP_PIN or AUTH_PIN_HASH before starting the app.')
}

async function getOrCreateAuthSettings() {
  const existing = await getStoredSettings()

  if (existing) {
    return existing
  }

  const pinHash = await bootstrapPinHash()

  const inserted = await query<AuthSettingsRow>(
    `
      INSERT INTO auth_settings (id, pin_hash)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
      RETURNING id, pin_hash, created_at, updated_at
    `,
    [PIN_RECORD_ID, pinHash]
  )

  return inserted.rows[0] ?? (await getStoredSettings())
}

function buildAttemptKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  const userAgent = request.headers.get('user-agent')?.trim() ?? 'unknown-agent'
  const source = `${forwardedFor || realIp || 'unknown-ip'}|${userAgent}`

  return createHash('sha256').update(source).digest('hex')
}

export async function getLoginThrottleState(request: Request) {
  await ensureAuthSchema()

  const attemptKey = buildAttemptKey(request)
  const result = await query<RateLimitRow>(
    `SELECT attempt_key, failure_count, last_failed_at, locked_until FROM auth_login_attempts WHERE attempt_key = $1 LIMIT 1`,
    [attemptKey]
  )

  const record = result.rows[0]

  if (!record?.locked_until) {
    return { limited: false, retryAfterSeconds: 0 }
  }

  const lockedUntil = new Date(record.locked_until)
  const retryAfterMs = lockedUntil.getTime() - Date.now()

  if (retryAfterMs <= 0) {
    await query(`DELETE FROM auth_login_attempts WHERE attempt_key = $1`, [attemptKey])
    return { limited: false, retryAfterSeconds: 0 }
  }

  return {
    limited: true,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  }
}

export async function clearFailedLoginAttempts(request: Request) {
  await ensureAuthSchema()
  await query(`DELETE FROM auth_login_attempts WHERE attempt_key = $1`, [buildAttemptKey(request)])
}

export async function registerFailedLoginAttempt(request: Request) {
  await ensureAuthSchema()

  const attemptKey = buildAttemptKey(request)
  const now = new Date()
  const result = await query<RateLimitRow>(
    `SELECT attempt_key, failure_count, last_failed_at, locked_until FROM auth_login_attempts WHERE attempt_key = $1 LIMIT 1`,
    [attemptKey]
  )

  const record = result.rows[0]
  const lastFailedAt = record?.last_failed_at ? new Date(record.last_failed_at) : null
  const withinFailureWindow = lastFailedAt ? now.getTime() - lastFailedAt.getTime() <= FAILURE_RESET_WINDOW_MS : false
  const failureCount = withinFailureWindow ? (record?.failure_count ?? 0) + 1 : 1
  const lockedUntil = failureCount >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_WINDOW_MS) : null

  await query(
    `
      INSERT INTO auth_login_attempts (attempt_key, failure_count, last_failed_at, locked_until)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (attempt_key)
      DO UPDATE SET
        failure_count = EXCLUDED.failure_count,
        last_failed_at = EXCLUDED.last_failed_at,
        locked_until = EXCLUDED.locked_until
    `,
    [attemptKey, failureCount, now.toISOString(), lockedUntil?.toISOString() ?? null]
  )

  return {
    failureCount,
    retryAfterSeconds: lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0,
  }
}

export async function verifyConfiguredPin(pin: string) {
  if (!isValidPinFormat(pin)) {
    return false
  }

  const settings = await getOrCreateAuthSettings()

  if (!settings) {
    throw new Error('Unable to load auth settings.')
  }

  return verifyPinAgainstHash(pin, settings.pin_hash)
}

export async function changeConfiguredPin(currentPin: string, newPin: string) {
  if (!isValidPinFormat(currentPin)) {
    return { success: false as const, code: 'CURRENT_PIN_INVALID' as const }
  }

  if (!isValidPinFormat(newPin)) {
    return { success: false as const, code: 'NEW_PIN_INVALID' as const }
  }

  const settings = await getOrCreateAuthSettings()

  if (!settings) {
    throw new Error('Unable to load auth settings.')
  }

  if (!verifyPinAgainstHash(currentPin, settings.pin_hash)) {
    return { success: false as const, code: 'CURRENT_PIN_MISMATCH' as const }
  }

  if (verifyPinAgainstHash(newPin, settings.pin_hash)) {
    return { success: false as const, code: 'PIN_REUSE' as const }
  }

  const nextPinHash = hashPin(newPin)

  await query(
    `UPDATE auth_settings SET pin_hash = $2, updated_at = now() WHERE id = $1`,
    [PIN_RECORD_ID, nextPinHash]
  )

  return { success: true as const }
}
