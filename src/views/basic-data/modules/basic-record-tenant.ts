import type { FormItem } from '@/components/core/forms/art-form/index.vue'
import { fetchGetTenantList } from '@/api/system-manage'
import { useTenantScopeStore } from '@/store/modules/tenantScope'

export function useBasicRecordTenant() {
  const scope = useTenantScopeStore()
  const needsTenantChoice = computed(() => scope.isAllTenants)
  const tenantField = computed<FormItem[]>(() =>
    needsTenantChoice.value
      ? [
          {
            label: '所属租户',
            key: 'tenantId',
            type: 'select',
            span: 12,
            api: () => fetchGetTenantList({ status: '1', from: 0, to: 999 }),
            resultField: 'data',
            labelField: 'tenantName',
            valueField: 'id',
            props: { filterable: true, clearable: true, placeholder: '请选择记录所属租户' }
          }
        ]
      : []
  )
  return {
    needsTenantChoice,
    tenantField,
    selectedTenantId: computed(() => scope.effectiveTenantId ?? '')
  }
}
