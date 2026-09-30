import type { OrderForm } from './order-open-model'

type OrderConfig = OrderForm['orderConfig']

/** Apply only values that the source actually stated, while clearing dependent stale choices. */
export function mergeAiOrderConfig(
  current: OrderConfig,
  suggestion: Api.Tms.Order.AiOrderConfigDraft | null | undefined
): OrderConfig {
  if (!suggestion) return current

  const patch = Object.fromEntries(
    Object.entries(suggestion).filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<OrderConfig>
  const next: OrderConfig = { ...current, ...patch }

  if (patch.loadType === 'ltl' && current.loadType !== 'ltl') {
    Object.assign(next, {
      vehicleType: '',
      vehicleLengthM: null,
      vehicleVolumeM3: null,
      vehicleLoadTons: null,
      truckCount: null
    })
  }
  if (patch.billingMode && patch.billingMode !== current.billingMode && !patch.billingUnit) {
    next.billingUnit = ''
  }
  if (patch.cargoCategory && patch.cargoCategory !== 'temperature') {
    next.tempMinC = null
    next.tempMaxC = null
  }
  if (
    patch.trackingMethod &&
    patch.trackingMethod !== current.trackingMethod &&
    !patch.trackingNumber
  ) {
    next.trackingNumber = ''
  }

  return next
}
