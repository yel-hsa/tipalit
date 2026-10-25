/*
 * Shared harness for driving the Firestore emulator over its REST API with
 * node:test + global fetch. No npm dependencies: the emulator speaks plain
 * HTTP, and rules are evaluated when a request carries a bearer token that
 * decodes to a user identity.
 *
 * Two token flavours:
 *  - OWNER_TOKEN: the literal string "owner" is the emulator's review agent
 *    (bypasses rules entirely). Used to seed fixtures.
 *  - userToken(claims): an unsigned Firebase-style JWT
 *    ({ alg:"none" } "." base64url(claims) "." ""). The emulator treats the
 *    claims as request.auth.token, which is what firestore.rules reads
 *    (uid, email, email_verified).
 */

export const PROJECT_ID = 'demo-tipalit'
export const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
export const BASE = `http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`
export const OWNER_TOKEN = 'owner'

/** A verified TIP student claim set: the shape firestore.rules keys off. */
export const tipClaims = (uid, email = `${uid}@tip.edu.ph`) => ({
  uid,
  sub: uid,
  email,
  email_verified: true,
  aud: PROJECT_ID,
  iss: `https://securetoken.google.com/${PROJECT_ID}`,
})

/** A verified non-TIP account (should fail isTipStudent). */
export const outsiderClaims = (uid) => tipClaims(uid, `${uid}@example.com`)

export const ADMIN_EMAIL = 'osa.admin@tip.edu.ph'

const b64url = (value) =>
  Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

export const userToken = (claims) => `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.`

/** Firestore REST value encoding. */
const encodeValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } }
  throw new TypeError(`Cannot encode ${typeof value} for Firestore`)
}

export const encodeFields = (data) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]))

/** Firestore REST value decoding (subset the tests need). */
export const decodeValue = (value) => {
  if (!value) return undefined
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {})
  return undefined
}

export const decodeFields = (fields = {}) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {})

export const docUrl = (path, query = '') => `${BASE}/${path}${query ? `?${query}` : ''}`

/** Low-level request; returns { status, json } (json null when not JSON). */
export async function request(method, url, { token, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: response.status, json, text }
}

/** Seeds/reads/writes as the rules-bypassing owner agent. */
export const owner = {
  create: (path, data) => request('POST', docUrl(path), { token: OWNER_TOKEN, body: { fields: encodeFields(data) } }),
  setWithId: (path, data) =>
    request('PATCH', docUrl(path), { token: OWNER_TOKEN, body: { fields: encodeFields(data) } }),
  get: (path) => request('GET', docUrl(path), { token: OWNER_TOKEN }),
  remove: (path) => request('DELETE', docUrl(path), { token: OWNER_TOKEN }),
}

/** Writes as a real user so rules are enforced. */
export const asUser = (token) => ({
  create: (path, data) => request('POST', docUrl(path), { token, body: { fields: encodeFields(data) } }),
  createWithId: (collection, docId, data) =>
    request('PATCH', docUrl(`${collection}/${docId}`), { token, body: { fields: encodeFields(data) } }),
  patch: (path, data) => request('PATCH', docUrl(path), { token, body: { fields: encodeFields(data) } }),
  /**
   * Partial update. The REST API treats a bare PATCH as a full replace, which
   * would drop seller_id/user_id and trip the rules' field access. Real
   * clients send an update mask, so every partial write here does too.
   */
  update: (path, data) => {
    const mask = Object.keys(data)
      .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
      .join('&')
    return request('PATCH', docUrl(path, mask), { token, body: { fields: encodeFields(data) } })
  },
  get: (path) => request('GET', docUrl(path), { token }),
  remove: (path) => request('DELETE', docUrl(path), { token }),
  /**
   * Runs a structured query through the REST `:runQuery` endpoint, which is
   * the only way to exercise the rules' query-shape checks. A list query is
   * allowed only when the rules can prove every returned document is
   * readable, so this is what catches a feed query the rules reject.
   */
  query: (collectionId, structuredQuery) =>
    request('POST', `${BASE}:runQuery`, {
      token,
      body: { structuredQuery: { from: [{ collectionId }], ...structuredQuery } },
    }),
})

/** Unique fixture ids so a single emulator run can be re-entered safely. */
export const uniqueId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const isForbidden = (result) => result.status === 403
export const isOk = (result) => result.status >= 200 && result.status < 300
