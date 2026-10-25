#!/usr/bin/env node

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
const ALLOWED_PROJECT = /^[a-z][a-z0-9-]{4,29}$/

function fail(message) {
  console.error(`[admin-claim] ${message}`)
  process.exit(1)
}

function loadAdmin() {
  const require = createRequire(path.join(REPO_ROOT, 'functions', 'package.json'))
  try {
    return {
      app: require('firebase-admin/app'),
      auth: require('firebase-admin/auth'),
    }
  } catch {
    fail('firebase-admin is unavailable. Run corepack pnpm install first.')
  }
}

function parseArgs(argv) {
  const values = new Map()
  const flags = new Set()
  for (const arg of argv) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const separator = arg.indexOf('=')
      values.set(arg.slice(2, separator), arg.slice(separator + 1))
    } else if (arg.startsWith('--')) {
      flags.add(arg.slice(2))
    } else {
      fail(`Unexpected argument: ${arg}`)
    }
  }
  return { values, flags }
}

const { values, flags } = parseArgs(process.argv.slice(2))
const uid = values.get('uid')?.trim()
const email = values.get('email')?.trim().toLowerCase()
const projectId = values.get('project')?.trim()
const remove = flags.has('remove')
const apply = flags.has('apply')
const expectedProject = values.get('confirm-project')?.trim()

if (!uid || uid.length > 128 || uid.includes('/')) fail('Provide a valid --uid=<Firebase UID>.')
if (email && (!email.endsWith('@tip.edu.ph') || email.length > 254)) {
  fail('When supplied, --email must be a valid @tip.edu.ph address.')
}
if (!projectId || !ALLOWED_PROJECT.test(projectId)) fail('Provide a valid --project=<Firebase project ID>.')
if (flags.has('grant') && remove) fail('Choose either grant (default) or --remove, not both.')
if (apply && expectedProject !== projectId) {
  fail('Apply mode requires --confirm-project=<same project ID>.')
}
if (apply && projectId.startsWith('demo-')) {
  fail('Use the Auth emulator API for demo projects; this tool is for explicitly selected Firebase projects.')
}

if (!apply) {
  console.log('TIPalit administrator claim tool — DRY RUN')
  console.log(`Project: ${projectId}`)
  console.log(`User UID: ${uid}`)
  console.log(`Expected email: ${email ?? '(verify interactively before apply)'}`)
  console.log(`Operation: ${remove ? 'REMOVE admin claim' : 'GRANT admin claim'}`)
  console.log('\nNo credentials were used and no claim was changed.')
  console.log(
    `Apply requires --apply --confirm-project=${projectId} and then verifies the stored user${
      email ? ' and email' : ''
    } before writing.`,
  )
  process.exit(0)
}

const { app, auth } = loadAdmin()
const instance = app.initializeApp({
  credential: app.applicationDefault(),
  projectId,
})

try {
  const authClient = auth.getAuth(instance)
  const user = await authClient.getUser(uid)
  if (email && user.email?.toLowerCase() !== email) {
    fail(`Stored email ${user.email ?? '(missing)'} does not match --email=${email}.`)
  }
  const before = user.customClaims ?? {}
  const next = { ...before }
  if (remove) {
    delete next.admin
  } else {
    next.admin = true
  }

  const operation = remove ? 'REMOVE admin claim' : 'GRANT admin claim'
  console.log('TIPalit administrator claim tool — APPLY')
  console.log(`Project: ${projectId}`)
  console.log(`User: ${user.uid} (${user.email ?? 'no email'})`)
  console.log(`Operation: ${operation}`)
  console.log(`Current admin claim: ${before.admin === true ? 'true' : String(before.admin ?? 'absent')}`)
  console.log(`Resulting admin claim: ${next.admin === true ? 'true' : 'absent'}`)
  console.log(`Other custom claims preserved: ${Object.keys(before).filter((key) => key !== 'admin').length}`)

  await authClient.setCustomUserClaims(uid, next)
  await authClient.revokeRefreshTokens(uid)
  console.log('\nApplied claim change and revoked refresh tokens. The user must sign in again.')
} finally {
  await app.deleteApp(instance)
}
