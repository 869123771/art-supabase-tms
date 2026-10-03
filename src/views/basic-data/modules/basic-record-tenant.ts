import type { FormItem } from '@/components/core/forms/art-form/index.vue'
import { fetchTenantList } from '@/api/system-manage'
import { useTenantScopeStore } from '@/store/modules/tenant-scope'
import { useTenantScopeFormPolicy } from '@/hooks/core/useTenantScopeFormPolicy'

export function useBasicRecordTenant() {
  const scope = useTenantScopeStore()
  const { defaultWriteTenantId } = useTenantScopeFormPolicy()
  const needsTenantChoice = computed(() => scope.isAllTenants)
  const tenantField = computed<FormItem[]>(() =>
    needsTenantChoice.value
      ? [
          {
            label: '所属租户',
            key: 'tenantId',
            type: 'select',
            span: 12,
            api: () => fetchTenantList({ status: '1', from: 0, to: 999 }),
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
    selectedTenantId: computed(() => defaultWriteTenantId.value ?? '')
  }
}
