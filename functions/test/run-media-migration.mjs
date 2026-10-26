#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const JDK_HOME = process.env.JDK25_HOME ?? 'C:/Program Files/Java/jdk-25'
const javaBin = path.join(
  JDK_HOME,
  'bin',
  process.platform === 'win32' ? 'java.exe' : 'java',
)
const javaHome = existsSync(javaBin)
  ? JDK_HOME
  : (process.env.JAVA_HOME ?? JDK_HOME)

if (
  !existsSync(
    path.join(
      javaHome,
      'bin',
      process.platform === 'win32' ? 'java.exe' : 'java',
    ),
  )
) {
  console.error(
    `[test:media-migration] JDK not found at ${javaHome}. Install JDK 21+ or set JDK25_HOME.`,
  )
  process.exit(1)
}

const migration = 'node scripts/firebase/migrate-listing-photos.mjs --project=demo-tipalit --limit=10'
const command = [
  'node functions/test/media-migration-fixture.mjs seed',
  migration,
  'node functions/test/media-migration-fixture.mjs verify-dry',
  `${migration} --apply --confirm-project=demo-tipalit`,
  'node functions/test/media-migration-fixture.mjs verify-apply',
  `${migration} --apply --confirm-project=demo-tipalit`,
  'node functions/test/media-migration-fixture.mjs verify-apply',
].join(' && ')
const emulatorCommand =
  `npx firebase emulators:exec --only firestore,storage --project demo-tipalit "${command}"`

const result = spawnSync(emulatorCommand, {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
    GCLOUD_PROJECT: 'demo-tipalit',
  },
})

process.exit(result.status ?? 1)
