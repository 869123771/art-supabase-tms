<template>
  <ReportWorkspace
    title="司机投产出分析"
    eyebrow="经营决策"
    description="关联订单、车辆与司机，比较经营产值和已归集成本。"
    icon="ri:user-star-line"
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
  defineOptions({ name: 'TmsReportDriverProductivity' })
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
  } = useReportQuery('driver-productivity', 'month')
  const chart = computed(() => financialComparison(overview.trend))
  const note =
    '承运吨数与方量按有效执行运单逐笔归集，缺失值待核算。营收与已归集成本按订单创建日期统计，取消运单不计入；一单多执行运单缺少收入分摊时，营收与毛利留空。薪酬通过同租户员工档案关联，读取筛选日期所覆盖月份中当前已审核或已发放的整月工资，实际月份及币种单列，不按查询天数折算；草稿、未审核及跨账套重复核算不合计，缺记录或权限时待核算。扣减包含税费等，不能全部当作违章扣款；雇主承担费用不等于工资。薪酬分摊单列，不修改原始运单费用；当前毛利并非完整人力损益。'
  const metrics = computed(() => financialMetrics(overview.summary, overview.loading, '分析司机'))
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('label', '司机', router, (row) => ({
        name: 'TmsReportOrderProfit',
        query: {
          keyword: String(row.label),
          start: appliedSearch.dates[0],
          end: appliedSearch.dates[1]
        }
      })),
      fixed: 'left'
    },
    textColumn('plate', '承运车辆'),
    numberColumn('weight_tons', '承运运量（吨）'),
    numberColumn('volume', '承运方量（m³）'),
    ...profitMeasureColumns,
    textColumn('payroll_months', '已审核薪酬月份', 180),
    textColumn('payroll_currency', '薪酬币种', 130),
    numberColumn('payroll_gross', '应发工资', 140),
    numberColumn('payroll_deductions', '薪酬扣减', 140),
    numberColumn('payroll_employer', '雇主承担费用', 160),
    numberColumn('payroll_net', '实发工资', 140),
    ...insuranceAllocationColumns,
    ...payrollAllocationColumns
  ]
</script>
