import process from 'node:process'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const pin = process.argv[2]?.trim() ?? ''

if (!/^\d{4,8}$/.test(pin)) {
  console.error('Usage: npm run pin:hash -- 123456')
  process.exit(1)
}

const iterations = 210_000
const salt = randomBytes(16).toString('base64url')
const digest = pbkdf2Sync(pin, salt, iterations, 32, 'sha256').toString('base64url')

console.log(`pbkdf2_sha256$${iterations}$${salt}$${digest}`)
