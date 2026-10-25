#!/usr/bin/env node
// live-data repair, dry run by default; --apply writes, --only=spots|program narrows
// auth: application default credentials, or GOOGLE_APPLICATION_CREDENTIALS
// firebase-admin is not a root dep; run from functions/ after npm run build

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

const SPOTS_COLLECTION = 'settings'
const SPOTS_DOC_ID = 'campus_meetup_spots'
const LEGACY_SPOTS_DOC_ID = 'meetup_spots'
const CAMPUSES = ['qc', 'manila']
const USERS_PROFILE = 'users_profile'

const args = new Set(process.argv.slice(2))
const APPLY = args.has('--apply')
const onlyArg = [...args].find((arg) => arg.startsWith('--only='))
const ONLY = onlyArg ? onlyArg.slice('--only='.length) : null // 'spots' | 'program' | null

function loadAdmin() {
  const require = createRequire(import.meta.url)
  // the app root does not depend on firebase-admin; the functions workspace does
  const candidates = [
    'firebase-admin',
    path.join(REPO_ROOT, 'functions', 'node_modules', 'firebase-admin'),
  ]
  for (const candidate of candidates) {
    try {
      return require(candidate)
    } catch {
      // try the next candidate
    }
  }
  console.error(
    'Could not load firebase-admin. Either run this via the functions workspace:\n' +
      '  (cd functions && node ../scripts/migrate-live-data.mjs)\n' +
      'or install it in the app root with: npm install --no-save firebase-admin',
  )
  process.exit(1)
}

// mirrors src/services/firebase/settings.ts#parseSpotList; keep the two in sync
function stripQuotes(spot) {
  if (spot.length >= 2) {
    const first = spot[0]
    const last = spot[spot.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return spot.slice(1, -1).trim()
    }
  }
  return spot
}

function splitBracketedList(inner) {
  return inner
    .split(',')
    .map((spot) => stripQuotes(spot.trim()))
    .filter((spot) => spot.length > 0)
}

function parseSpotList(value) {
  if (Array.isArray(value)) {
    return value
      .filter((spot) => typeof spot === 'string')
      .map((spot) => spot.trim())
      .filter((spot) => spot.length > 0)
  }

  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parseSpotList(parsed)
    } catch {
      // not valid json; fall through to the bracketed/unquoted shape
    }
    const inner = trimmed.slice(1, trimmed.endsWith(']') ? -1 : undefined)
    return splitBracketedList(inner)
  }

  return splitBracketedList(trimmed)
}

const isPlainArrayOfStrings = (value) =>
  Array.isArray(value) && value.every((spot) => typeof spot === 'string' && spot.trim().length > 0)

const sameList = (a, b) => a.length === b.length && a.every((spot, i) => spot === b[i])

// repair 1: settings/campus_meetup_spots
function describeShape(value) {
  if (value === undefined) return 'missing'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'string') return `string(${value.length} chars)`
  return typeof value
}

async function repairSpots(db) {
  console.log(`\n=== [1/2] ${SPOTS_COLLECTION}/${SPOTS_DOC_ID} ===`)

  const spotsRef = db.collection(SPOTS_COLLECTION).doc(SPOTS_DOC_ID)
  const snap = await spotsRef.get()

  if (!snap.exists) {
    console.warn(`Document does not exist — nothing to normalize.`)
    const legacySnap = await db.collection(SPOTS_COLLECTION).doc(LEGACY_SPOTS_DOC_ID).get()
    if (legacySnap.exists) {
      console.warn(
        `Note: legacy ${SPOTS_COLLECTION}/${LEGACY_SPOTS_DOC_ID} exists. This script does NOT copy it — ` +
          'the agreed fix is for the code to read the campus_meetup_spots id.',
      )
    }
    return { changed: 0 }
  }

  const data = snap.data() ?? {}
  const patch = {}

  for (const campus of CAMPUSES) {
    const raw = data[campus]
    const parsed = parseSpotList(raw)
    console.log(`  ${campus}: ${describeShape(raw)} -> ${parsed.length} spots`)

    if (raw !== undefined && !Array.isArray(raw)) {
      console.log(`    raw: ${JSON.stringify(raw)}`)
    }

    if (parsed.length === 0) {
      if (raw !== undefined) {
        console.warn(`    SKIP: could not parse any spots for ${campus}; leaving value untouched.`)
      } else {
        console.log(`    (absent — app falls back to seed defaults for ${campus})`)
      }
      continue
    }

    if (isPlainArrayOfStrings(raw) && sameList(raw, parsed)) {
      console.log(`    OK: already a clean array.`)
      continue
    }

    console.log(`    PLAN: write real array ${JSON.stringify(parsed)}`)
    patch[campus] = parsed
  }

  const otherKeys = Object.keys(data).filter((key) => !CAMPUSES.includes(key))
  if (otherKeys.length > 0) {
    console.log(`  (other keys left untouched: ${otherKeys.join(', ')})`)
  }

  const changed = Object.keys(patch).length
  if (changed === 0) {
    console.log('  No changes needed.')
    return { changed: 0 }
  }

  if (!APPLY) {
    console.log(`  DRY RUN: would update ${changed} field(s). Re-run with --apply to write.`)
    return { changed }
  }

  await spotsRef.set(patch, { merge: true })
  console.log(`  APPLIED: updated ${Object.keys(patch).join(', ')}.`)
  return { changed }
}

// repair 2: users_profile.program backfilled from department
const isMissingProgram = (value) => value === undefined || value === null || value === ''

async function repairPrograms(db) {
  console.log(`\n=== [2/2] ${USERS_PROFILE}.program <- department ===`)

  const refs = []
  let scanned = 0

  const all = await db.collection(USERS_PROFILE).get()
  for (const docSnap of all.docs) {
    scanned += 1
    const data = docSnap.data() ?? {}
    if (!isMissingProgram(data.program) || isMissingProgram(data.department)) continue
    refs.push({ ref: docSnap.ref, id: docSnap.id, department: String(data.department).trim() })
  }

  console.log(`  Scanned ${scanned} profile(s); ${refs.length} need program backfilled.`)
  for (const { id, department } of refs.slice(0, 20)) {
    console.log(`    ${id}: program <- ${JSON.stringify(department)}`)
  }
  if (refs.length > 20) {
    console.log(`    ... and ${refs.length - 20} more.`)
  }

  if (refs.length === 0) {
    console.log('  No changes needed.')
    return { changed: 0 }
  }

  if (!APPLY) {
    console.log(`  DRY RUN: would update ${refs.length} profile(s). Re-run with --apply to write.`)
    return { changed: refs.length }
  }

  let written = 0
  const CHUNK = 400
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch()
    for (const { ref, department } of refs.slice(i, i + CHUNK)) {
      batch.set(ref, { program: department }, { merge: true })
    }
    await batch.commit()
    written += Math.min(CHUNK, refs.length - i)
    console.log(`  APPLIED: ${written}/${refs.length}`)
  }

  return { changed: written }
}

async function main() {
  const admin = loadAdmin()
  admin.initializeApp()
  // firebase-admin 14 dropped the namespaced admin.firestore(); use the modular entry
  const { getFirestore } = createRequire(import.meta.url)('firebase-admin/firestore')
  const db = getFirestore()

  console.log(`TIPalit live-data repair — ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`)
  console.log(`Project: ${process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '(from credentials)'}`)
  if (ONLY) console.log(`Only: ${ONLY}`)

  let spots = { changed: 0 }
  let programs = { changed: 0 }

  if (!ONLY || ONLY === 'spots') spots = await repairSpots(db)
  if (!ONLY || ONLY === 'program') programs = await repairPrograms(db)

  console.log('\n=== Summary ===')
  console.log(`  spots fields ${APPLY ? 'updated' : 'to update'}: ${spots.changed}`)
  console.log(`  profiles     ${APPLY ? 'updated' : 'to update'}: ${programs.changed}`)
  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to perform the writes.')
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exitCode = 1
})
