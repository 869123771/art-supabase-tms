<template>
  <ReportWorkspace
    title="客户毛利分析"
    eyebrow="经营决策"
    description="关联订单、车辆与司机，比较经营产值和已归集成本。"
    icon="ri:building-line"
    :metrics="metrics"
    :table="tableQueryRef"
  >
    <ReportTrend
      title="经营表现"
      subtitle="营收前 6 个对象 · 单位：元"
      v-bind="chart"
      :loading="overview.loading"
      :error="overview.error"
      @retry="reload"
    />
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
          description="金额仅含已归集项目，完整盈亏需补齐成本。"
          :note="note + payrollAllocationNote + insuranceAllocationNote"
      /></template>
    </ArtTableQuery>
  </ReportWorkspace>
</template>
<script setup lang="ts">
  import { computed, h } from 'vue'
  import { useRouter } from 'vue-router'

  import type { ColumnOption } from '@/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import type { ReportRow } from '../../../api/modules/management-reports'
  import ReportWorkspace from '../../components/management-reports/workspace.vue'
  import ReportNote from '../../components/management-reports/report-note.vue'
  import ReportTrend from '../../components/management-reports/report-trend.vue'
  import { useReportQuery } from '../../components/management-reports/use-report-query'
  import {
    linkColumn,
    textColumn,
    numberColumn,
    profitMeasureColumns,
    insuranceAllocationColumns,
    insuranceAllocationNote,
    payrollAllocationColumns,
    payrollAllocationNote
  } from '../../components/management-reports/report-cells'
  import { financialMetrics } from '../../components/management-reports/report-metrics'
  import { financialComparison } from '../../components/management-reports/financial-comparison'
  defineOptions({ name: 'TmsReportCustomerProfit' })
  const router = useRouter()
  const {
    tableQueryRef,
    overview,
    search,
    appliedSearch,
    searchItems,
    searchBarProps,
    tableProps,
    fetchRows,
    reload
  } = useReportQuery('customer-profit', 'month')
  const chart = computed(() => financialComparison(overview.trend))
  const note =
    '按订单创建日期汇总客户，取消订单及运单不计入。订单运量由公斤换算为吨，方量沿用订单立方米，一单多运单只计一次；未派车订单也纳入货量，缺失货量保留待核算。收入按订单去重，成本仅含已归集项目，未派车订单成本未知；工资、折旧、保险尚未完整分摊，毛利不等于净利润。已关联投诉统计期间提交、同租户运单号唯一且归属单一客户的投诉，咨询及多客户合单不计入；无投诉来源查看权限时待核算，零不代表客户没有未关联投诉。应收按财务单业务日期及查询结束日核销余额统计，与应收跟踪表一致，不含期前单据；多币种不合计，缺失或无权查看的金额待核算。'
  const metrics = computed(() => financialMetrics(overview.summary, overview.loading, '分析客户'))
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('label', '客户', router, (row) => ({
        name: 'TmsReportOrderProfit',
        query: {
          keyword: String(row.label),
          start: appliedSearch.dates[0],
          end: appliedSearch.dates[1]
        }
      })),
      fixed: 'left'
    },
    {
      prop: 'customer_level',
      label: '客户等级',
      minWidth: 120,
      formatter: (row) =>
        h(ArtDictDisplay, {
          dictCode: 'tmsCustomerLevel',
          value: typeof row.customer_level === 'string' ? row.customer_level : null,
          display: 'tag',
          emptyText: '未维护'
        })
    },
    numberColumn('weight_tons', '订单运量（吨）'),
    numberColumn('volume', '订单方量（m³）'),
    ...profitMeasureColumns,
    numberColumn('complaints', '已关联投诉次数', 170),
    textColumn('receivable_currency', '应收币种 / 范围', 180),
    numberColumn('receivable_balance', '期间应收未核销余额', 190),
    numberColumn('overdue_amount', '期间应收逾期金额', 180),
    ...insuranceAllocationColumns,
    ...payrollAllocationColumns
  ]
</script>
