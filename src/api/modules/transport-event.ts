import { useSupabase } from '@/hooks'

const { supabase, responseHandle } = useSupabase()

type TransportEvent = Api.Tms.TransportEvent.Record
type SearchParams = Api.Tms.TransportEvent.SearchParams

interface TransportEventPage {
  records?: TransportEvent[]
  total?: number
  overview?: Api.Tms.TransportEvent.Overview
}

const startOfDay = (value: string): string => `${value}T00:00:00`
const endOfDay = (value: string): string => `${value}T23:59:59.999`

export async function fetchTransportEventList(params: SearchParams = {}) {
  const from = Math.max(params.from ?? 0, 0)
  const to = Math.max(params.to ?? from + 19, from)
  const result = await responseHandle<TransportEventPage>(
    () =>
      supabase.rpc('tms_list_transport_events_secure', {
        p_from: from,
        p_to: to,
        p_event_type: params.eventType || null,
        p_keyword: params.keyword?.trim() || null,
        p_event_start: params.eventTimeRange?.[0] ? startOfDay(params.eventTimeRange[0]) : null,
        p_event_end: params.eventTimeRange?.[1] ? endOfDay(params.eventTimeRange[1]) : null
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
