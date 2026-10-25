import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/premiumRenderEstimate.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
vm.runInNewContext(javascript, { exports, Intl, Number })
const {
  estimatePremiumRenderOutputCost,
  formatPremiumRenderOutputEstimate,
  PREMIUM_IMAGE_OUTPUT_PRICE_USD,
} = exports

test('estimates output-only cost at the configured per-image standard rate', () => {
  assert.equal(PREMIUM_IMAGE_OUTPUT_PRICE_USD, 0.0336)
  assert.equal(estimatePremiumRenderOutputCost(0), 0)
  assert.equal(estimatePremiumRenderOutputCost(1), 0.0336)
  assert.equal(estimatePremiumRenderOutputCost(3), 0.1008)
})

test('formats an approximate USD amount with four decimal places', () => {
  assert.equal(formatPremiumRenderOutputEstimate(0), '$0.0000')
  assert.equal(formatPremiumRenderOutputEstimate(1), '$0.0336')
  assert.equal(formatPremiumRenderOutputEstimate(3), '$0.1008')
})

test('treats invalid or negative frame counts as zero', () => {
  assert.equal(estimatePremiumRenderOutputCost(-2), 0)
  assert.equal(estimatePremiumRenderOutputCost(Number.NaN), 0)
  assert.equal(estimatePremiumRenderOutputCost(Number.POSITIVE_INFINITY), 0)
})
