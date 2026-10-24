<template>
  <ReportWorkspace
    title="月度经营总览看板"
    eyebrow="经营决策"
    description="关联订单、车辆与司机，比较经营产值和已归集成本。"
    icon="ri:bar-chart-box-line"
    :metrics="metrics"
    :table="tableQueryRef"
  >
    <ReportTrend
      title="经营表现"
      subtitle="所选期间按月汇总 · 单位：元"
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
  import dayjs from 'dayjs'
  import type { ColumnOption } from '@/types'
  import { fetchMonthlyOverview, type ReportRow } from '../../../api/modules/management-reports'
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
    payrollAllocationNote,
    reportNumber
  } from '../../components/management-reports/report-cells'
  import { financialMetrics } from '../../components/management-reports/report-metrics'
  import { financialComparison } from '../../components/management-reports/financial-comparison'
  defineOptions({ name: 'TmsReportMonthlyOverview' })
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
  } = useReportQuery('monthly-overview', 'two-months', fetchMonthlyOverview)
  const chart = computed(() => financialComparison(overview.trend.slice(-6)))
  const note =
    '按订单创建日期统计全部未取消订单，重量由千克换算为吨，订单收入、运量与方量按订单去重。本年累计从筛选结束日所在年份的1月1日统计至该结束日，沿用当前关键词及租户权限；图表和明细仍使用所选期间。未关联有效主运单的订单计入待归集订单；这些订单的运输成本及所在月份毛利保留待核算，不按零成本处理。已有运单沿用已审核费用口径；工资、折旧、保险等尚未完整分摊，毛利不等于净利润。'
  const metrics = computed(() => {
    const items = financialMetrics(overview.summary, overview.loading, '统计月份')
    const keys = ['ytd_revenue', 'ytd_cost', 'ytd_profit']
    keys.forEach((key, index) => {
      const value = overview.summary[key]
      items[index + 1].description = overview.loading
        ? '本年累计读取中…'
        : `本年累计 ${reportNumber(value)}${typeof value === 'number' ? ' 元' : ''}`
    })
    items[0].description = overview.summary.ytd_end
      ? `年累计截至 ${overview.summary.ytd_end}`
      : '当前筛选范围 · 全量统计'
    return items
  })
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('label', '统计月份', router, (row) => {
        const start = String(row.label) + '-01'
        const end = dayjs(start).endOf('month').format('YYYY-MM-DD')
        return {
          name: 'TmsReportCustomerProfit',
          query: {
            keyword: appliedSearch.keyword,
            start: start > appliedSearch.dates[0] ? start : appliedSearch.dates[0],
            end: end < appliedSearch.dates[1] ? end : appliedSearch.dates[1]
          }
        }
      }),
      fixed: 'left'
    },
    numberColumn('weight_tons', '订单运量（吨）'),
    numberColumn('volume', '订单方量（m³）'),
    numberColumn('undispatched', '待归集订单', 120),
    ...profitMeasureColumns,
    ...insuranceAllocationColumns,
    ...payrollAllocationColumns
  ]
</script>
