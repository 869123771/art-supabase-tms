import type { AiOrderMasterDataTask } from './ai-order-types'

// Keep this limit aligned with create_ai_order_master_data's transaction limit.
export const MAX_AI_ORDER_MASTER_DATA_TASKS = 20

export function reconcileAiOrderMasterDataSelection(
  tasks: readonly Pick<AiOrderMasterDataTask, 'key' | 'ready'>[],
  selectedKeys: readonly string[],
  manuallySelected: boolean
): string[] {
  const availableKeys = tasks.filter((task) => task.ready).map((task) => task.key)
  const available = new Set(availableKeys)
  const retained = selectedKeys.filter((key) => available.has(key))

  return (retained.length || manuallySelected ? retained : availableKeys).slice(
    0,
    MAX_AI_ORDER_MASTER_DATA_TASKS
  )
}
