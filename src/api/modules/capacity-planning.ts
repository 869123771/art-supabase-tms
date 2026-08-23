import { useSupabase } from '@/hooks'

const { supabase, responseHandle } = useSupabase()

type CapacityPlanningSource = Partial<Api.Tms.CapacityPlanning.Overview>

export async function fetchCapacityPlanning(
  days: Api.Tms.CapacityPlanning.PeriodDays = 14
): Promise<Api.Tms.CapacityPlanning.Overview> {
  const result = await responseHandle<CapacityPlanningSource>(
    () => supabase.rpc('tms_get_capacity_planning_secure', { p_days: days }),
    { showErrorMessage: true }
  )
  if (result.error) throw result.error

  const source = result.data
  return {
    generatedAt: source?.generatedAt ?? new Date().toISOString(),
    periodDays: source?.periodDays ?? days,
    activeFleetCount: source?.activeFleetCount ?? 0,
    fleetCapacityTon: source?.fleetCapacityTon ?? 0,
    activeWaybillCount: source?.activeWaybillCount ?? 0,
    assignedVehicleCount: source?.assignedVehicleCount ?? 0,
    availableVehicleCount: source?.availableVehicleCount ?? 0,
    unassignedActiveCount: source?.unassignedActiveCount ?? 0,
    backlogCount: source?.backlogCount ?? 0,
    returnedBacklogCount: source?.returnedBacklogCount ?? 0,
    truncated: source?.truncated === true,
    daily: source?.daily ?? [],
    backlog: source?.backlog ?? []
  }
}
