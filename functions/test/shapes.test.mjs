/*
 * Pure unit tests for the two data shapes that broke live production:
 *   (a) listing images — array / JSON string / bracketed-unquoted / garbage
 *   (b) meetup spots   — real arrays / stringified arrays / missing field
 *
 * The parsers under test come from ./shapes.mjs, a local reference
 * implementation of the documented contract (see the header there). Streams A
 * and B are writing the real parsers in src/ concurrently; once they export
 * them, point these imports at the real modules and delete shapes.mjs. The
 * assertions below are the contract and should not need to change.
 *
 * Runs without the emulator: `node --test functions/test/shapes.test.mjs`.
 */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { FALLBACK_IMAGE, FALLBACK_SPOTS, parseListingImages, parseMeetupSpots } from './shapes.mjs'

const URL_A = 'https://firebasestorage.googleapis.com/v0/b/tipalit.appspot.com/o/listings%2Fa.jpg?alt=media'
const URL_B = 'https://firebasestorage.googleapis.com/v0/b/tipalit.appspot.com/o/listings%2Fb.jpg?alt=media'

/** Every parser call must return a non-empty array of non-empty strings. */
const assertUsableImages = (result) => {
  assert.ok(Array.isArray(result), `expected an array, got ${typeof result}`)
  assert.ok(result.length > 0, 'expected at least one image (fallback)')
  for (const value of result) {
    assert.equal(typeof value, 'string')
    assert.ok(value.trim().length > 0, 'image entries must be non-empty strings')
  }
}

describe('parseListingImages — never throws, always degrades', () => {
  test('real array of URLs is preserved in order', () => {
    const result = parseListingImages([URL_A, URL_B])
    assert.deepEqual(result, [URL_A, URL_B])
  })

  test('JSON stringified array is parsed', () => {
    const result = parseListingImages(JSON.stringify([URL_A, URL_B]))
    assert.deepEqual(result, [URL_A, URL_B])
  })

  test('bracketed unquoted string is split into entries', () => {
    const result = parseListingImages('[https://cdn.example.com/a.jpg, https://cdn.example.com/b.jpg]')
    assert.deepEqual(result, ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'])
  })

  test('bracketed single-quoted string is split and unquoted', () => {
    const result = parseListingImages("['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg']")
    assert.deepEqual(result, ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'])
  })

  test('bare URL string becomes a one-element array', () => {
    assert.deepEqual(parseListingImages(URL_A), [URL_A])
  })

  test('array with non-string entries keeps only the strings', () => {
    const result = parseListingImages([URL_A, 42, null, { url: URL_B }, '', URL_B])
    assert.deepEqual(result, [URL_A, URL_B])
  })

  test('array of only non-strings falls back', () => {
    assert.deepEqual(parseListingImages([1, 2, null, {}]), [FALLBACK_IMAGE])
  })

  test('garbage inputs never throw and always fall back', () => {
    const garbage = [
      undefined,
      null,
      0,
      42,
      true,
      {},
      { 0: URL_A },
      '',
      '   ',
      'not json at all',
      '[',
      '[]',
      '[,,,]',
      '{"a":1}',
      NaN,
      () => URL_A,
      Symbol('x'),
    ]
    for (const input of garbage) {
      let result
      assert.doesNotThrow(() => {
        result = parseListingImages(input)
      }, `threw on ${String(input)}`)
      assertUsableImages(result)
      assert.deepEqual(result, [FALLBACK_IMAGE], `expected fallback for ${String(input)}`)
    }
  })

  test('malformed JSON array degrades to the bracketed split, not a throw', () => {
    // Missing closing quote/bracket: JSON.parse fails, the split path runs.
    const result = parseListingImages('[https://cdn.example.com/a.jpg, https://cdn.example.com/b.jpg')
    assertUsableImages(result)
    assert.deepEqual(result, ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'])
  })

  test('custom fallback is honoured', () => {
    assert.deepEqual(parseListingImages(null, 'https://cdn.example.com/fallback.jpg'), [
      'https://cdn.example.com/fallback.jpg',
    ])
  })
})

describe('parseMeetupSpots — never throws, degrades per campus', () => {
  test('real arrays are preserved', () => {
    const result = parseMeetupSpots({ qc: ['Library Plaza', 'Main Lobby'], manila: ['Library Lobby'] })
    assert.deepEqual(result, { qc: ['Library Plaza', 'Main Lobby'], manila: ['Library Lobby'] })
  })

  test('stringified arrays are parsed', () => {
    const result = parseMeetupSpots({
      qc: JSON.stringify(['Library Plaza', 'Main Lobby']),
      manila: JSON.stringify(['Library Lobby']),
    })
    assert.deepEqual(result, { qc: ['Library Plaza', 'Main Lobby'], manila: ['Library Lobby'] })
  })

  test('missing field falls back for that campus only', () => {
    const result = parseMeetupSpots({ qc: ['Library Plaza'] })
    assert.deepEqual(result.qc, ['Library Plaza'])
    assert.deepEqual(result.manila, FALLBACK_SPOTS.manila)
  })

  test('missing document falls back for both campuses', () => {
    assert.deepEqual(parseMeetupSpots(undefined), FALLBACK_SPOTS)
    assert.deepEqual(parseMeetupSpots(null), FALLBACK_SPOTS)
  })

  test('garbage inputs never throw and always fall back', () => {
    const garbage = [0, 42, true, '', 'nope', '[]', '[', {}, { qc: 5, manila: {} }, { qc: [], manila: [] }]
    for (const input of garbage) {
      let result
      assert.doesNotThrow(() => {
        result = parseMeetupSpots(input)
      }, `threw on ${String(input)}`)
      assert.deepEqual(result, FALLBACK_SPOTS, `expected fallback for ${String(input)}`)
    }
  })

  test('fallback lists are copies, not shared references', () => {
    const first = parseMeetupSpots(null)
    first.qc.push('Injected Spot')
    const second = parseMeetupSpots(null)
    assert.ok(!second.qc.includes('Injected Spot'), 'mutating a result must not poison the fallback')
  })

  test('non-string entries inside an array are dropped', () => {
    const result = parseMeetupSpots({ qc: ['Library Plaza', 7, null, 'Main Lobby'], manila: ['Library Lobby'] })
    assert.deepEqual(result.qc, ['Library Plaza', 'Main Lobby'])
  })
})
