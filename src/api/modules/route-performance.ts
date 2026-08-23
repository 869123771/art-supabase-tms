import { useSupabase } from '@/hooks'

const { supabase, responseHandle } = useSupabase()

interface RoutePerformanceSource {
  generatedAt?: string
  periodDays?: number
  totalRecords?: number
  returnedRecords?: number
  truncated?: boolean
  records?: Api.Tms.RoutePerformance.Record[]
}

export async function fetchRoutePerformance(days = 90): Promise<Api.Tms.RoutePerformance.Overview> {
  const result = await responseHandle<RoutePerformanceSource>(
    () => supabase.rpc('tms_get_route_performance_secure', { p_days: days }),
    { showErrorMessage: true }
  )
  if (result.error) throw result.error

  const records = result.data?.records ?? []
  const scheduledTrips = records.reduce((sum, record) => sum + record.scheduledTrips, 0)
  const onTimeTrips = records.reduce((sum, record) => sum + record.onTimeTrips, 0)
  return {
    generatedAt: result.data?.generatedAt ?? new Date().toISOString(),
    periodDays: result.data?.periodDays ?? days,
    totalRecords: result.data?.totalRecords ?? records.length,
    returnedRecords: result.data?.returnedRecords ?? records.length,
    truncated: result.data?.truncated === true,
    routeCount: records.length,
    completedTrips: records.reduce((sum, record) => sum + record.completedTrips, 0),
    activeTrips: records.reduce((sum, record) => sum + record.activeTrips, 0),
    delayedActiveTrips: records.reduce((sum, record) => sum + record.delayedActiveTrips, 0),
    onTimeRate: scheduledTrips ? Math.round((onTimeTrips * 1000) / scheduledTrips) / 10 : undefined,
    cargoWeightTon: records.reduce((sum, record) => sum + record.cargoWeightTon, 0),
    records
  }
}
