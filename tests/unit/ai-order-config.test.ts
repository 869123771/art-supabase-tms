import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeAiOrderConfig } from '../../src/views/order-open/modules/ai-order-config'
import { createInitialOrderConfig } from '../../src/views/order-open/modules/order-open-model'

test('AI config applies explicit false values and preserves fields absent from the source', () => {
  const current = { ...createInitialOrderConfig(), insured: true, packaging: 'box' }
  const result = mergeAiOrderConfig(current, {
    insured: false,
    packaging: null,
    billingMode: 'weight'
  })

  assert.equal(result.insured, false)
  assert.equal(result.packaging, 'box')
  assert.equal(result.billingMode, 'weight')
  assert.equal(current.insured, true)
})

test('AI config clears dependent values when the chosen mode changes', () => {
  const current = {
    ...createInitialOrderConfig(),
    loadType: 'ftl' as const,
    vehicleType: '厢式',
    truckCount: 2,
    billingMode: 'volume' as const,
    billingUnit: 'cubic_meter',
    cargoCategory: 'temperature',
    tempMinC: 2,
    tempMaxC: 8,
    trackingMethod: 'express',
    trackingNumber: 'EXP-1'
  }
  const result = mergeAiOrderConfig(current, {
    loadType: 'ltl',
    billingMode: 'weight',
    cargoCategory: 'general',
    trackingMethod: 'electronic_receipt'
  })

  assert.equal(result.vehicleType, '')
  assert.equal(result.truckCount, null)
  assert.equal(result.billingUnit, '')
  assert.equal(result.tempMinC, null)
  assert.equal(result.tempMaxC, null)
  assert.equal(result.trackingNumber, '')
})
