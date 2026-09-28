import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSplitLines,
  validateSplitInputs
} from '../../src/views/waybill-management/modules/split-dispatch-model'

const cargo = [
  { cargoName: '托盘', quantity: 3, weightKg: 300, volumeM3: 1.5 }
] as Api.Tms.Order.CargoItem[]

test('first split requires two batches, while a partially dispatched order can add one', () => {
  const batch = [{ lineIndex: 0, amount: 3 }]

  assert.equal(validateSplitInputs(cargo, 'quantity', [batch]), '首次拆单至少需要两个执行批次')
  assert.equal(validateSplitInputs(cargo, 'quantity', [batch], 1), null)
  assert.match(
    validateSplitInputs(cargo, 'quantity', [[{ lineIndex: 0, amount: 4 }]], 1) ?? '',
    /超过剩余量/
  )
})

test('splitting one cargo line preserves its quantity, weight and volume', () => {
  const first = buildSplitLines(cargo, 'quantity', [{ lineIndex: 0, amount: 1 }])[0]
  const second = buildSplitLines(cargo, 'quantity', [{ lineIndex: 0, amount: 2 }])[0]

  assert.equal(first.quantity + second.quantity, 3)
  assert.equal(Number(first.weightKg) + Number(second.weightKg), 300)
  assert.equal(Number(first.volumeM3) + Number(second.volumeM3), 1.5)
})
