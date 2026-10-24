<template>
  <ReportWorkspace
    title="车辆调度状态台账"
    eyebrow="运营管理分析"
    description="按所选期间核对执行情况，跟进待办与异常。"
    icon="ri:bar-chart-box-line"
    :metrics="metrics"
    :table="tableQueryRef"
  >
    <ArtTableQuery
      ref="tableQueryRef"
      v-model="search"
      :search-items="searchItems"
      :search-bar-props="searchBarProps"
      :api-fn="fetchRows"
      :columns-factory="columnsFactory"
      :table-props="tableProps"
      focusable
    >
      <template #header-left
        ><ReportNote description="按所选日期统计，明细保留业务追溯入口。" :note="note"
      /></template>
    </ArtTableQuery>
  </ReportWorkspace>
</template>
<script setup lang="ts">
  import { computed } from 'vue'

  import type { ColumnOption } from '@/types'
  import type { ReportRow } from '../../../api/modules/management-reports'
  import ReportWorkspace from '../../components/management-reports/workspace.vue'
  import ReportNote from '../../components/management-reports/report-note.vue'

  import { useReportQuery } from '../../components/management-reports/use-report-query'
  import { textColumn, numberColumn } from '../../components/management-reports/report-cells'
  import { reportMetric } from '../../components/management-reports/report-metrics'
  defineOptions({ name: 'TmsReportVehicleDispatch' })

  const { tableQueryRef, overview, search, searchItems, searchBarProps, tableProps, fetchRows } =
    useReportQuery('vehicle-dispatch', 'day')
  const note =
    '一车一行，列出当前租户范围内车辆档案；当前任务取最近一张未签收 / 未完成运单，维修状态取有效维修记录。此页为当前状态快照，统计日期不用于隐藏车辆档案。位置、预计回场、维修计划缺少统一来源时留空；额定载重不是剩余可装载量。年检取最近记录，保险取最近保单到期日，含已过期保单。'
  const metrics = computed(() => [
    reportMetric(
      '车辆总数',
      overview.summary.count,
      '辆 · 当前车辆档案',
      'ri:truck-line',
      overview.loading
    ),
    reportMetric(
      '在途车辆',
      overview.summary.in_transit,
      '辆 · 当前执行任务',
      'ri:route-line',
      overview.loading
    ),
    reportMetric(
      '待派车辆',
      overview.summary.dispatch_ready,
      '辆 · 当前可跟进',
      'ri:calendar-line',
      overview.loading
    ),
    reportMetric(
      '维修车辆',
      overview.summary.repair,
      '辆 · 有效维修记录',
      'ri:tools-line',
      overview.loading
    )
  ])
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    { ...textColumn('plate', '车牌'), fixed: 'left' },
    textColumn('vehicle_no', '车辆编号'),
    textColumn('vehicle_type', '车型'),
    textColumn('driver', '当前司机'),
    textColumn('location', '车辆位置'),
    textColumn('status', '当前状态'),
    numberColumn('capacity_tons', '额定吨位（吨）'),
    numberColumn('capacity_volume', '额定体积（m³）'),
    textColumn('orders', '当前绑定订单', 280),
    textColumn('planned_departure', '计划出车'),
    textColumn('expected_return', '预计回场'),
    textColumn('maintenance_plan', '维修计划'),
    textColumn('inspection_due', '年检到期'),
    textColumn('insurance_due', '保险到期'),
    textColumn('note', '备注', 280)
  ]
</script>
