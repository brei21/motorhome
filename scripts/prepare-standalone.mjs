import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const standaloneDir = '.next/standalone'

async function copyIfExists(source, destination) {
  if (!existsSync(source)) return
  await cp(source, destination, { recursive: true, force: true })
}

async function main() {
  if (!existsSync(standaloneDir)) {
    console.warn('Standalone output not found; skipping asset copy.')
    return
  }

  await mkdir(`${standaloneDir}/.next`, { recursive: true })
  await copyIfExists('public', `${standaloneDir}/public`)
  await copyIfExists('.next/static', `${standaloneDir}/.next/static`)
  console.log('Standalone assets copied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
