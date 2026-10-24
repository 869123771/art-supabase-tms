<template>
  <ReportWorkspace
    title="订单异常台账"
    eyebrow="运营管理分析"
    description="按所选期间核对执行情况，跟进待办与异常。"
    icon="ri:alarm-warning-line"
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
  import { useRouter } from 'vue-router'

  import type { ColumnOption } from '@/types'
  import type { ReportRow } from '../../../api/modules/management-reports'
  import ReportWorkspace from '../../components/management-reports/workspace.vue'
  import ReportNote from '../../components/management-reports/report-note.vue'

  import { useReportQuery } from '../../components/management-reports/use-report-query'
  import {
    linkColumn,
    textColumn,
    numberColumn
  } from '../../components/management-reports/report-cells'
  import { reportMetric } from '../../components/management-reports/report-metrics'
  defineOptions({ name: 'TmsReportOrderExceptions' })
  const router = useRouter()
  const { tableQueryRef, overview, search, searchItems, searchBarProps, tableProps, fetchRows } =
    useReportQuery('order-exceptions', 'day')
  const note =
    '合并回单异常工单与超期未签收提示；提示行不是已登记异常，结案状态为待核实。已登记工单展示跟进人、上报时间与处理记录。缺少统一核损与理赔来源时金额待核算。'
  const metrics = computed(() => [
    reportMetric(
      '分析订单',
      overview.summary.count,
      '当前筛选范围',
      'ri:bar-chart-box-line',
      overview.loading
    ),
    reportMetric(
      '已签收 / 完成',
      overview.summary.completed,
      '票 · 当前执行结果',
      'ri:checkbox-circle-line',
      overview.loading
    ),
    reportMetric(
      '超期未签收',
      overview.summary.late,
      '票 · 已超过计划到达时间',
      'ri:alarm-warning-line',
      overview.loading
    ),
    reportMetric(
      '已上传回单',
      overview.summary.receipt,
      '票 · 上传不等于审核通过',
      'ri:file-check-line',
      overview.loading
    )
  ])
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('order_no', '订单号', router, (row) =>
        row.order_id ? { name: 'TmsOrderDetail', params: { id: String(row.order_id) } } : null
      ),
      fixed: 'left'
    },
    textColumn('plate', '车牌'),
    textColumn('driver', '司机'),
    textColumn('customer', '客户'),
    textColumn('origin', '起运地'),
    textColumn('destination', '目的地'),
    textColumn('created', '开单时间'),
    textColumn('planned', '计划到货'),
    textColumn('arrived', '实际到货'),
    textColumn('exception_type', '异常类型'),
    textColumn('stage', '发生节点'),
    textColumn('description', '异常描述', 280),
    numberColumn('estimated_loss', '损失预估（元）'),
    textColumn('responsible', '责任 / 跟进人'),
    textColumn('reported', '上报时间'),
    textColumn('actions', '处理措施'),
    numberColumn('damage', '货损金额（元）'),
    numberColumn('claim', '理赔金额（元）'),
    textColumn('status', '结案状态')
  ]
</script>
