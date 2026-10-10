import { toDateStartTimestamp, toDateEndTimestamp } from '@/utils/time/date-boundary'
import { normalizeNullableText } from '@/utils/form/normalize'
import { useSupabase } from '@/hooks/core/useSupabase'

const { supabase, responseHandle } = useSupabase()

type TransportEvent = Api.Tms.TransportEvent.Record
type SearchParams = Api.Tms.TransportEvent.SearchParams

interface TransportEventPage {
  records?: TransportEvent[]
  total?: number
  overview?: Api.Tms.TransportEvent.Overview
}

export async function fetchTransportEventList(params: SearchParams = {}) {
  const from = Math.max(params.from ?? 0, 0)
  const to = Math.max(params.to ?? from + 19, from)
  const result = await responseHandle<TransportEventPage>(
    () =>
      supabase.rpc('tms_list_transport_events_secure', {
        p_from: from,
        p_to: to,
        p_event_type: params.eventType || null,
        p_keyword: normalizeNullableText(params.keyword),
        p_event_start: params.eventTimeRange?.[0]
          ? toDateStartTimestamp(params.eventTimeRange[0])
          : null,
        p_event_end: params.eventTimeRange?.[1]
          ? toDateEndTimestamp(params.eventTimeRange[1])
          : null
      }),
    { showErrorMessage: true }
  )
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error
  }
}

export async function fetchTransportEventOverview(): Promise<Api.Tms.TransportEvent.Overview> {
  const result = await responseHandle<TransportEventPage>(
    () =>
      supabase.rpc('tms_list_transport_events_secure', {
        p_from: 0,
        p_to: 0,
        p_event_type: null,
        p_keyword: null,
        p_event_start: null,
        p_event_end: null
      }),
    { showErrorMessage: true, breakReturn: true }
  )
  return (
    result.data?.overview ?? {
      eventCount7d: 0,
      activeWaybillCount: 0,
      delayedWaybillCount: 0,
      exceptionEventCount: 0
    }
  )
}
