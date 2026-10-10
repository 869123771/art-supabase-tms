import { useSupabase } from '@/hooks/core/useSupabase'
import type { ApiFeedbackOptions } from '@/types/api/request'

const { supabase, keysToSnakeDeep, responseHandle } = useSupabase()

export async function fetchOrderQuote(orderId: string, options: ApiFeedbackOptions = {}) {
  return await responseHandle<Api.Tms.Order.OrderQuoteContext>(
    () => supabase.rpc('tms_get_order_quote_secure', { p_order_id: orderId }),
    { showErrorMessage: options.showErrorMessage ?? true, breakReturn: true }
  )
}

export async function saveOrderQuote(
  orderId: string,
  payload: Api.Tms.Order.OrderQuotePayload,
  submit: boolean,
  options: ApiFeedbackOptions = {}
) {
  return await responseHandle<Api.Tms.Order.OrderQuoteRecord>(
    () =>
      supabase.rpc('tms_save_order_quote_secure', {
        p_order_id: orderId,
        p_payload: keysToSnakeDeep(payload),
        p_submit: submit
      }),
    { showErrorMessage: options.showErrorMessage ?? true, breakReturn: true }
  )
}
