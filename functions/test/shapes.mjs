/*
 * Reference implementations of the two data-shape parsers that broke live
 * production. Streams A and B are writing the real ones concurrently, so these
 * are NOT imported from src/ — they encode the documented contract so the
 * tests can run today and pin the behaviour the real parsers must match.
 *
 * CONTRACT (both parsers):
 *   1. Never throw, for any input, including null/undefined/garbage.
 *   2. Always return a usable value: an array of strings, or the fallback.
 *   3. Degrade rather than propagate: a partially-bad input keeps its good
 *      entries; a wholly-bad input yields the fallback.
 *
 * When the real parsers land, swap the imports in shapes.test.mjs for the
 * exported functions and delete this file. The assertions should not change.
 */

/** Fallback cover used when a listing has no usable image at all. */
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6'

/** Fallback meetup spots, mirroring src/data/seed.ts MEETUP_SPOTS. */
export const FALLBACK_SPOTS = {
  qc: ['Library Plaza', 'Main Lobby', 'Cafeteria Entrance', 'Engineering Building Steps', 'Gate 2 Security Post'],
  manila: ['Library Lobby', 'Main Gate Security Post', 'Canteen Entrance', 'Student Lounge'],
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

/** http(s) or data: URLs only — the schemes an <img src> can actually use. */
const isUrl = (value) => /^(https?:\/\/|data:image\/)/i.test(value)

/**
 * Parses a listing's image field, which arrives in four shapes depending on
 * which writer produced it:
 *   - a real array of URLs (Firestore arrayValue)
 *   - a JSON stringified array ("[\"a\",\"b\"]") from an older client
 *   - a bracketed, unquoted string ("[a, b]") from a hand-edited doc
 *   - garbage (null, numbers, objects, malformed JSON)
 * Returns a non-empty string[]; falls back to [fallback] when nothing usable.
 */
export function parseListingImages(raw, fallback = FALLBACK_IMAGE) {
  const cleaned = (values) => values.filter(isNonEmptyString).map((value) => value.trim())

  const fromArray = (values) => cleaned(values)

  const fromString = (value) => {
    const text = value.trim()
    if (text.length === 0) return []

    // JSON array first: it is the only shape that can carry commas in URLs.
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return fromArray(parsed)
      } catch {
        // Not JSON — fall through to the bracketed-unquoted form.
      }
      // "[a, b]" / "['a', 'b']": strip the brackets, split, strip quotes.
      return cleaned(
        text
          .replace(/^\[/, '')
          .replace(/\]$/, '')
          .split(',')
          .map((part) => part.trim().replace(/^["']|["']$/g, '')),
      )
    }

    // A bare URL string is a single image, not a list. Anything else (prose,
    // a stray number, a half-written value) is garbage and must not become an
    // <img src>.
    return isUrl(text) ? [text] : []
  }

  let images = []
  if (Array.isArray(raw)) images = fromArray(raw)
  else if (typeof raw === 'string') images = fromString(raw)

  return images.length > 0 ? images : [fallback]
}

/**
 * Parses the settings/meetup_spots document into { qc: string[], manila: string[] }.
 * Accepts real arrays, JSON stringified arrays, and a missing/partial field.
 * Each campus degrades independently to its fallback list.
 */
export function parseMeetupSpots(raw, fallback = FALLBACK_SPOTS) {
  const parseCampus = (value, campus) => {
    const fallbackList = [...fallback[campus]]

    if (Array.isArray(value)) {
      const spots = value.filter(isNonEmptyString).map((spot) => spot.trim())
      return spots.length > 0 ? spots : fallbackList
    }

    if (typeof value === 'string') {
      const text = value.trim()
      if (text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            const spots = parsed.filter(isNonEmptyString).map((spot) => spot.trim())
            return spots.length > 0 ? spots : fallbackList
          }
        } catch {
          // Malformed JSON: treat as absent.
        }
      }
    }

    return fallbackList
  }

  const source = typeof raw === 'object' && raw !== null ? raw : {}
  return {
    qc: parseCampus(source.qc, 'qc'),
    manila: parseCampus(source.manila, 'manila'),
  }
}
