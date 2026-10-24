<template>
  <ReportWorkspace
    title="经营风险汇总"
    eyebrow="经营决策"
    description="汇总应收逾期、履约异常、车辆事故和司机违章，核对风险事项与处理状态。"
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
        ><ReportNote
          description="应收按业务日期、事故违章按发生日期、履约异常按订单创建日期筛选。"
          :note="note"
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
  defineOptions({ name: 'TmsReportBusinessRisk' })
  const router = useRouter()
  const { tableQueryRef, overview, search, searchItems, searchBarProps, tableProps, fetchRows } =
    useReportQuery('business-risk', 'month')
  const note =
    '应收逾期取截至筛选结束日的已审核运输财务应收余额，与应收跟踪表共用口径；无金额查看权限的应收不据此判定逾期。事故取公司承担金额，违章取罚款，均受原业务字段权限控制。风险金额按币种列示，不代表预计损失；无明确关联的订单、客户不推算。货损理赔和统一风险分级尚未合并，自动超期提示不代表已建立处理工单。'
  const metrics = computed(() => [
    reportMetric(
      '风险事项',
      overview.summary.count,
      '条 · 当前筛选范围，按事项计数',
      'ri:bar-chart-box-line',
      overview.loading
    )
  ])
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    { ...textColumn('risk_type', '风险类型', 140), fixed: 'left' },
    {
      ...linkColumn('order_no', '订单号', router, (row) =>
        row.order_id ? { name: 'TmsOrderDetail', params: { id: String(row.order_id) } } : null
      )
    },
    textColumn('plate', '车牌'),
    textColumn('driver', '司机'),
    textColumn('customer', '客户'),
    numberColumn('risk_amount', '风险金额', 140),
    textColumn('currency', '币种', 80),
    textColumn('status', '处理状态'),
    textColumn('description', '风险说明', 280),
    textColumn('occurred', '发生 / 提示 / 到期时间', 190),
    numberColumn('estimated_loss', '预计损失'),
    textColumn('risk_level', '风险等级')
  ]
</script>
