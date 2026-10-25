#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const JDK_HOME = process.env.JDK25_HOME ?? 'C:/Program Files/Java/jdk-25'
const javaBin = path.join(JDK_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
// ci exports JAVA_HOME via setup-java; the windows default path does not exist there
const javaHome = existsSync(javaBin) ? JDK_HOME : (process.env.JAVA_HOME ?? JDK_HOME)

if (!existsSync(path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) {
  console.error(`[test:rules] JDK not found at ${javaHome}. Install JDK 21+ or set JDK25_HOME.`)
  process.exit(1)
}

const filter = process.argv[2] ?? ''
const specs = readdirSync(HERE)
  .filter(
    (name) =>
      name.endsWith('-rules.test.mjs') &&
      name.includes(filter),
  )
  .map((name) => `functions/test/${name}`)

if (specs.length === 0) {
  console.error(`[test:rules] no test files matched "${filter}" in functions/test`)
  process.exit(1)
}

const body = `node --test ${specs.join(' ')}`

// windows shell spawning re-splits argv, so the script is passed as one quoted string
const command = `npx firebase emulators:exec --only firestore --project demo-tipalit "${body}"`

const result = spawnSync(command, {
  cwd: path.resolve(HERE, '..', '..'),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  },
})

process.exit(result.status ?? 1)
