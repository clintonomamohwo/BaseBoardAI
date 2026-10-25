import assert from 'node:assert/strict'
import test from 'node:test'
import {
  estimateRemainingImageTime,
  formatElapsedTime,
  formatRemainingTimeRange,
} from '../src/utils/genesisTimeEstimate.ts'

test('waits for enough image samples before estimating remaining time', () => {
  assert.equal(estimateRemainingImageTime(9, 2, 10), null)
  assert.equal(estimateRemainingImageTime(30, 1, 10), null)
  assert.equal(estimateRemainingImageTime(30, 2, 2), null)
  assert.equal(estimateRemainingImageTime(30, 10, 2), null)
})

test('projects remaining image time from the observed average frame pace with a wide range', () => {
  assert.deepEqual(estimateRemainingImageTime(60, 2, 10), {
    minSeconds: 144,
    maxSeconds: 480,
  })
})

test('the estimated range updates as more frames complete', () => {
  const early = estimateRemainingImageTime(60, 2, 10)
  const later = estimateRemainingImageTime(60, 5, 10)
  assert.ok(early)
  assert.ok(later)
  assert.ok(later.maxSeconds < early.minSeconds)
})

test('formats elapsed time and approximate remaining ranges without false precision', () => {
  assert.equal(formatElapsedTime(0), '0s')
  assert.equal(formatElapsedTime(65), '1m 05s')
  assert.equal(formatRemainingTimeRange({ minSeconds: 10, maxSeconds: 55 }), 'under 1 min')
  assert.equal(formatRemainingTimeRange({ minSeconds: 90, maxSeconds: 210 }), '1–4 min')
})
