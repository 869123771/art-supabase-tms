import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  carrierSelections,
  parseCarrierSelections
} from '../../src/views/basic-data/carrier/modules/carrier-selection'

const options = [
  { value: 'truckload', label: '整车运输' },
  { value: 'less_than_truckload', label: '零担运输' }
]

test('restores legacy carrier values and preserves multiple selections', () => {
  assert.deepEqual(carrierSelections(undefined, 'truckload'), ['truckload'])
  assert.deepEqual(carrierSelections(['truckload', 'less_than_truckload'], 'truckload'), [
    'truckload',
    'less_than_truckload'
  ])
})

test('imports multiple dictionary codes or labels without duplicates', () => {
  assert.deepEqual(
    parseCarrierSelections('整车运输，less_than_truckload;整车运输', options, '承运商类型'),
    ['truckload', 'less_than_truckload']
  )
  assert.throws(
    () => parseCarrierSelections('未知运输', options, '承运商类型'),
    /承运商类型包含无效选项/
  )
})
