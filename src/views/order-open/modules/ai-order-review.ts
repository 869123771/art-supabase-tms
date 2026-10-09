import { normalizeNullableNumber, normalizeNullableText } from '@/utils/form/normalize'
import type { OrderForm } from './order-open-model'
import { normalizeCargoItems } from './order-open-model'

export function buildAiOrderFinalPayload(order: OrderForm): Api.Tms.Order.AiOrderDraft {
  return {
    originStationName: normalizeNullableText(order.originStation),
    destinationStationName: normalizeNullableText(order.destinationStation),
    transferStationName: normalizeNullableText(order.transferStation),
    deliveryMethod: normalizeNullableText(order.deliveryMethod),
    shippingCustomerName: normalizeNullableText(order.shippingCustomerName),
    shippingContactName: normalizeNullableText(order.shippingContactName),
    shippingContactPhone: normalizeNullableText(order.shippingContactPhone),
    shippingAddressDetail: normalizeNullableText(order.shippingAddressDetail),
    receivingCustomerName: normalizeNullableText(order.receivingCustomerName),
    receivingContactName: normalizeNullableText(order.receivingContactName),
    receivingContactPhone: normalizeNullableText(order.receivingContactPhone),
    receivingAddressDetail: normalizeNullableText(order.receivingAddressDetail),
    cargoItems: normalizeCargoItems(order.cargoItems),
    transportFee: normalizeNullableNumber(order.transportFee),
    deliveryFee: normalizeNullableNumber(order.deliveryFee),
    unloadingFee: normalizeNullableNumber(order.unloadingFee),
    collectPaymentFee: normalizeNullableNumber(order.collectPaymentFee),
    transferFee: normalizeNullableNumber(order.transferFee),
    declaredValue: normalizeNullableNumber(order.declaredValue),
    insuranceFee: normalizeNullableNumber(order.insuranceFee),
    packageFee: normalizeNullableNumber(order.packageFee),
    otherFee: normalizeNullableNumber(order.otherFee),
    paymentMethod: normalizeNullableText(order.paymentMethod),
    cashAmount: normalizeNullableNumber(order.cashAmount),
    collectAmount: normalizeNullableNumber(order.collectAmount),
    monthlyAmount: normalizeNullableNumber(order.monthlyAmount),
    codAmount: normalizeNullableNumber(order.codAmount),
    handlingFee: normalizeNullableNumber(order.handlingFee),
    transportMode: normalizeNullableText(order.transportMode),
    orderRemark: normalizeNullableText(order.orderRemark),
    orderConfig: { ...order.orderConfig }
  }
}
