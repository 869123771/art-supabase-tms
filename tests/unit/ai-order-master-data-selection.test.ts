import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_AI_ORDER_MASTER_DATA_TASKS,
  reconcileAiOrderMasterDataSelection
} from '../../src/views/order-open/modules/ai-order-master-data-selection'

const tasks = Array.from({ length: 24 }, (_, index) => ({
  key: `cargo:${index}`,
  ready: true
}))

test('AI master data defaults to no more than the RPC transaction limit', () => {
  const selected = reconcileAiOrderMasterDataSelection(tasks, [], false)

  assert.equal(selected.length, MAX_AI_ORDER_MASTER_DATA_TASKS)
  assert.deepEqual(
    selected,
    tasks.slice(0, MAX_AI_ORDER_MASTER_DATA_TASKS).map((task) => task.key)
  )
})

test('AI master data keeps an intentional empty selection after task refresh', () => {
  assert.deepEqual(reconcileAiOrderMasterDataSelection(tasks, [], true), [])
})

test('AI master data drops unavailable selections while preserving the chosen order', () => {
  const nextTasks = tasks.map((task) => ({
    ...task,
    ready: task.key !== 'cargo:1'
  }))

  assert.deepEqual(
    reconcileAiOrderMasterDataSelection(nextTasks, ['cargo:2', 'cargo:1', 'cargo:0'], true),
    ['cargo:2', 'cargo:0']
  )
})
