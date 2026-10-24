<template>
  <ReportWorkspace
    title="线路盈亏分析"
    eyebrow="经营决策"
    description="关联订单、车辆与司机，比较经营产值和已归集成本。"
    icon="ri:route-line"
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
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'

  import type { ColumnOption } from '@/types'
  import type { ReportRow } from '../../../api/modules/management-reports'
  import ReportWorkspace from '../../components/management-reports/workspace.vue'
  import ReportNote from '../../components/management-reports/report-note.vue'
  import ReportTrend from '../../components/management-reports/report-trend.vue'
  import { useReportQuery } from '../../components/management-reports/use-report-query'
  import {
    linkColumn,
    numberColumn,
    profitMeasureColumns,
    insuranceAllocationColumns,
    insuranceAllocationNote,
    payrollAllocationColumns,
    payrollAllocationNote
  } from '../../components/management-reports/report-cells'
  import { financialMetrics } from '../../components/management-reports/report-metrics'
  import { financialComparison } from '../../components/management-reports/financial-comparison'
  defineOptions({ name: 'TmsReportRouteProfit' })
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
  } = useReportQuery('route-profit', 'month')
  const chart = computed(() => financialComparison(overview.trend))
  const note =
    '按订单创建日期汇总订单起讫线路，取消订单及运单不计入。订单运量由公斤换算为吨，方量沿用订单立方米，一单多运单只计一次；未派车订单也纳入货量，缺失货量保留待核算。收入按订单去重，成本仅含已归集项目，未派车订单成本未知；工资、折旧、保险尚未完整分摊，毛利不等于净利润。单位收入、已归集单位成本分别除以订单运量；运量非正数或分子缺失时待核算。'
  const metrics = computed(() => financialMetrics(overview.summary, overview.loading, '分析线路'))
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('label', '线路', router, (row) => ({
        name: 'TmsReportOrderProfit',
        query: {
          keyword: String(row.label),
          start: appliedSearch.dates[0],
          end: appliedSearch.dates[1]
        }
      })),
      fixed: 'left'
    },
    numberColumn('weight_tons', '订单运量（吨）'),
    numberColumn('volume', '订单方量（m³）'),
    ...profitMeasureColumns,
    numberColumn('unit_revenue', '单位收入（元/吨）', 170),
    numberColumn('unit_cost', '已归集单位成本（元/吨）', 210),
    ...insuranceAllocationColumns,
    ...payrollAllocationColumns
  ]
</script>
