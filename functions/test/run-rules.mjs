#!/usr/bin/env node
/*
 * Boots the Firestore emulator, runs every node:test spec under
 * functions/test, then tears it down. Zero dependencies: firebase-tools and
 * node are already on PATH.
 *
 *   npm run test:rules            # all *.test.mjs
 *   npm run test:rules -- listings  # only files whose name matches "listings"
 *
 * The Firestore emulator (firebase-tools 15.11.0) requires JDK 21+; the
 * machine's default java is 17, so this pins JAVA_HOME to JDK 25 (override
 * with JDK25_HOME). The test body is handed to the emulator through an
 * environment variable rather than argv so quoting survives Windows shells.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const JDK_HOME = process.env.JDK25_HOME ?? 'C:/Program Files/Java/jdk-25'
const javaBin = path.join(JDK_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
// CI installs a JDK via setup-java and exports JAVA_HOME; the Windows default
// path above does not exist there.
const javaHome = existsSync(javaBin) ? JDK_HOME : (process.env.JAVA_HOME ?? JDK_HOME)

if (!existsSync(path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) {
  console.error(`[test:rules] JDK not found at ${javaHome}. Install JDK 21+ or set JDK25_HOME.`)
  process.exit(1)
}

const filter = process.argv[2] ?? ''
const specs = readdirSync(HERE)
  .filter((name) => name.endsWith('.test.mjs') && name.includes(filter))
  .map((name) => `functions/test/${name}`)

if (specs.length === 0) {
  console.error(`[test:rules] no test files matched "${filter}" in functions/test`)
  process.exit(1)
}

// node --test receives plain paths; no glob expansion needed.
const body = `node --test ${specs.join(' ')}`

// firebase-tools takes the script as ONE argv entry. On Windows, spawning
// through a shell re-splits argv, so the whole command is passed as a single
// string with the script double-quoted. The script is built from a fixed
// prefix plus file names read from this directory — no user input.
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
