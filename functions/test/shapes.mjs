// reference parsers: never throw, always return a usable value, degrade per entry
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6'

// mirrors src/data/seed.ts MEETUP_SPOTS
export const FALLBACK_SPOTS = {
  qc: ['Library Plaza', 'Main Lobby', 'Cafeteria Entrance', 'Engineering Building Steps', 'Gate 2 Security Post'],
  manila: ['Library Lobby', 'Main Gate Security Post', 'Canteen Entrance', 'Student Lounge'],
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

// only schemes an <img src> can use
const isUrl = (value) => /^(https?:\/\/|data:image\/)/i.test(value)

// live docs store image_ids as an array, a json string, or a bare bracketed list
export function parseListingImages(raw, fallback = FALLBACK_IMAGE) {
  const cleaned = (values) => values.filter(isNonEmptyString).map((value) => value.trim())

  const fromArray = (values) => cleaned(values)

  const fromString = (value) => {
    const text = value.trim()
    if (text.length === 0) return []

    // json first: it is the only shape that can carry commas in urls
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return fromArray(parsed)
      } catch {
        // not json; fall through to the bracketed-unquoted form
      }
      return cleaned(
        text
          .replace(/^\[/, '')
          .replace(/\]$/, '')
          .split(',')
          .map((part) => part.trim().replace(/^["']|["']$/g, '')),
      )
    }

    // prose or half-written values must not become an <img src>
    return isUrl(text) ? [text] : []
  }

  let images = []
  if (Array.isArray(raw)) images = fromArray(raw)
  else if (typeof raw === 'string') images = fromString(raw)

  return images.length > 0 ? images : [fallback]
}

// each campus degrades independently to its own fallback list
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
          // malformed json; treat as absent
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
