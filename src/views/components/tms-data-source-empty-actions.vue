<template>
  <ArtDataSourceEmptyActions :resource-name="config.resourceName" :actions="config.actions" />
</template>

<script setup lang="ts">
  import ArtDataSourceEmptyActions, {
    type ArtDataSourceEmptyAction
  } from '@/components/business/art-data-source-empty-actions/index.vue'

  defineOptions({ name: 'TmsDataSourceEmptyActions' })

  type TmsDataSource =
    | 'cargo'
    | 'contract'
    | 'customer'
    | 'customer-address'
    | 'employee'
    | 'favorite-route'
    | 'vehicle'

  interface SourceConfig {
    resourceName: string
    actions: readonly ArtDataSourceEmptyAction[]
  }

  const props = defineProps<{ source: TmsDataSource }>()

  const sourceConfigs: Record<TmsDataSource, SourceConfig> = {
    cargo: {
      resourceName: '货物资料',
      actions: [{ label: '去维护货物', routeName: 'TmsCargo', icon: 'ri:archive-line' }]
    },
    contract: {
      resourceName: '运输合同',
      actions: [
        {
          label: '去维护合同',
          routeName: 'TmsContract',
          permission: 'TmsContract:View',
          icon: 'ri:file-list-3-line'
        }
      ]
    },
    customer: {
      resourceName: '客户资料',
      actions: [
        {
          label: '去维护客户',
          routeName: 'TmsCustomer',
          permission: 'TmsCustomer:View',
          icon: 'ri:user-star-line'
        }
      ]
    },
    'customer-address': {
      resourceName: '客户地址',
      actions: [
        { label: '去维护客户地址', routeName: 'TmsCustomerAddress', icon: 'ri:map-pin-line' },
        {
          label: '去维护客户',
          routeName: 'TmsCustomer',
          permission: 'TmsCustomer:View',
          icon: 'ri:user-star-line'
        }
      ]
    },
    employee: {
      resourceName: '员工花名册',
      actions: [
        {
          label: '去维护员工',
          routeName: 'HrEmployeeRoster',
          permission: 'Hr:Employee:View',
          icon: 'ri:user-settings-line'
        }
      ]
    },
    'favorite-route': {
      resourceName: '常用线路',
      actions: [{ label: '去维护常用线路', routeName: 'TmsFavoriteRoute', icon: 'ri:route-line' }]
    },
    vehicle: {
      resourceName: '车辆档案',
      actions: [
        {
          label: '去维护车辆档案',
          routeName: 'VehicleArchiveManage',
          permission: 'VehicleArchive:View',
          icon: 'ri:truck-line'
        }
      ]
    }
  }

  const config = computed(() => sourceConfigs[props.source])
</script>
