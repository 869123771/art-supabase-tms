import { useSupabase } from '@/hooks'
import { isNil, omitBy } from 'lodash-es'

type WaybillRecord = Api.Tms.Waybill.WaybillRecord
type WaybillSearchParams = Api.Tms.Waybill.WaybillSearchParams
type DispatchPlan = Api.Tms.Waybill.DispatchPlan
type ExecutionSource = Api.Tms.Waybill.ExecutionSource

interface DispatchWorkbenchResponse {
  records: WaybillRecord[]
  total: number
  fieldAccess: Api.Tms.Waybill.WaybillFieldAccessMap
  waybillStatusCounts: Record<string, number>
}

interface AllocationReceipt {
  allocationId: string
  signedQuantity: number
  exceptionQuantity: number
  exceptionNote?: string | null
}

interface ExecutionReceiptPayload {
  waybillId: string
  signedAt: string
  signerName: string
  receiptUrls: string[]
  signatureUrls: string[]
  remark?: string | null
  allocations: AllocationReceipt[]
}

const { supabase, keysToSnakeDeep, responseHandle } = useSupabase()

export async function fetchDispatchWorkbench(
  params: WaybillSearchParams & {
    from?: number
    to?: number
    maxRows?: number
    countOnly?: boolean
    ids?: string[]
  },
  mode: 'pending' | 'loaded'
) {
  const from = Math.max(params.from ?? 0, 0)
  const to = Math.max(params.maxRows ? from + params.maxRows - 1 : (params.to ?? 9), from)
  const result = await responseHandle<DispatchWorkbenchResponse>(
    () =>
      supabase.rpc('tms_list_dispatch_workbench_secure', {
        p_mode: mode,
        p_from: from,
        p_to: to,
        p_count_only: params.countOnly === true,
        p_filters: keysToSnakeDeep(
          omitBy(
            {
              recordId: params.recordId || null,
              ids: params.ids?.length ? params.ids : null,
              orderStatus: params.orderStatus || null,
              paymentMethod: params.paymentMethod || null,
              originStationId: params.originStationId || null,
              destinationStationId: params.destinationStationId || null,
              transferStationId: params.transferStationId || null,
              waybillStatus:
                params.waybillStatus === '__all__' ? null : params.waybillStatus || null,
              cargoKeyword: params.cargoKeyword || null,
              shippingKeyword: params.shippingKeyword || null,
              receivingKeyword: params.receivingKeyword || null,
              vehicleKeyword: params.vehicleKeyword || null,
              createTimeRange: params.createTimeRange?.length === 2 ? params.createTimeRange : null,
              plannedTimeRange:
                params.plannedTimeRange?.length === 2 ? params.plannedTimeRange : null
            },
            isNil
          )
        )
      }),
    { showErrorMessage: true }
  )
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {},
    waybillStatusCounts: result.data?.waybillStatusCounts ?? {}
  }
}

export async function submitDispatchPlan(plan: DispatchPlan) {
  return await responseHandle<{ waybillIds: string[]; waybillNos: string[] }>(
    () =>
      supabase.rpc('tms_create_dispatch_plan_secure', {
        p_plan: keysToSnakeDeep(plan)
      }),
    { showMessage: true, breakReturn: true }
  )
}

export async function fetchExecutionSources(waybillId: string) {
  return await responseHandle<ExecutionSource[]>(
    () => supabase.rpc('tms_get_execution_sources_secure', { p_waybill_id: waybillId }),
    { showErrorMessage: true }
  )
}

export async function signExecutionAllocations(payload: ExecutionReceiptPayload) {
  return await responseHandle(
    () =>
      supabase.rpc('tms_sign_execution_allocations_secure', {
        p_waybill_id: payload.waybillId,
        p_signed_at: payload.signedAt,
        p_signer_name: payload.signerName,
        p_receipt_urls: payload.receiptUrls,
        p_signature_urls: payload.signatureUrls,
        p_remark: payload.remark || null,
        p_allocations: keysToSnakeDeep(payload.allocations)
      }),
    { showMessage: true, breakReturn: true }
  )
}
