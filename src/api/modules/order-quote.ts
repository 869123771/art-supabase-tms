import { useSupabase } from '@/hooks'

const { supabase, keysToSnakeDeep, responseHandle } = useSupabase()

export async function fetchOrderQuote(orderId: string) {
  return await responseHandle<Api.Tms.Order.OrderQuoteContext>(
    () => supabase.rpc('tms_get_order_quote_secure', { p_order_id: orderId }),
    { showErrorMessage: true, breakReturn: true }
  )
}

export async function saveOrderQuote(
  orderId: string,
  payload: Api.Tms.Order.OrderQuotePayload,
  submit: boolean
) {
  return await responseHandle<Api.Tms.Order.OrderQuoteRecord>(
    () =>
      supabase.rpc('tms_save_order_quote_secure', {
        p_order_id: orderId,
        p_payload: keysToSnakeDeep(payload),
        p_submit: submit
      }),
    { showErrorMessage: true, breakReturn: true }
  )
}
