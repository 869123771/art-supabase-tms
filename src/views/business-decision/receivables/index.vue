<template>
  <ReportWorkspace
    title="应收账款跟踪表"
    eyebrow="经营决策"
    description="追踪运输业务财务应收，核对开票、净回款和到期未结余额。"
    icon="ri:wallet-3-line"
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
        ><ReportNote description="按财务应收业务日期筛选，余额截至所选结束日期。" :note="note"
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
  defineOptions({ name: 'TmsReportReceivables' })

  const {
    tableQueryRef,
    overview,
    search,
    searchItems: baseSearchItems,
    searchBarProps,
    tableProps,
    fetchRows
  } = useReportQuery('receivables', 'month')
  const searchItems = baseSearchItems.map((item) =>
    item.key === 'keyword'
      ? { ...item, props: { ...item.props, placeholder: '应收单 / 订单 / 运单 / 客户' } }
      : item
  )
  const note =
    '仅统计由运输签收运单暂估下推的已审核财务应收，不重复计入暂估。净回款为已审核收款减退款；抵销、坏账等列为其他核销。逾期按应收到期日计算，贷项不计逾期。多币种不合并金额；催收记录和风险分级尚未接入。'
  const currencyHint = computed(() =>
    Number(overview.summary.currency_count) > 1
      ? '多币种 · 请按明细币种核对'
      : `${overview.summary.currency || '原币'} · 截至结束日期`
  )
  const metrics = computed(() => [
    reportMetric(
      '财务应收单',
      overview.summary.count,
      '当前筛选范围',
      'ri:file-list-3-line',
      overview.loading
    ),
    reportMetric(
      '未核销余额',
      overview.summary.amount,
      currencyHint.value,
      'ri:wallet-3-line',
      overview.loading
    ),
    reportMetric(
      '逾期未结金额',
      overview.summary.overdue_amount,
      currencyHint.value,
      'ri:alarm-warning-line',
      overview.loading
    ),
    reportMetric(
      '最长逾期',
      overview.summary.oldest_days,
      '天 · 按未结应收到期日起算',
      'ri:calendar-line',
      overview.loading
    )
  ])
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    { ...textColumn('statement', '财务应收单号', 180), fixed: 'left' },
    textColumn('customer', '客户'),
    textColumn('currency', '币种', 80),
    numberColumn('total_amount', '应收金额'),
    numberColumn('invoiced_amount', '开票金额'),
    numberColumn('received_amount', '净回款'),
    numberColumn('other_applied_amount', '其他核销'),
    numberColumn('amount', '未核销余额'),
    numberColumn('overdue_amount', '逾期金额'),
    numberColumn('days', '逾期天数'),
    textColumn('due_date', '到期日'),
    textColumn('payment_term', '收款条件'),
    textColumn('period', '业务日期'),
    textColumn('order_no', '订单号'),
    textColumn('waybill_no', '运单号'),
    textColumn('document_type', '单据类型'),
    textColumn('collection_record', '催收记录'),
    textColumn('risk_level', '风险等级')
  ]
</script>
