<template>
  <ReportWorkspace
    title="单车盈亏分析"
    eyebrow="经营决策"
    description="关联订单、车辆与司机，比较经营产值和已归集成本。"
    icon="ri:truck-line"
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
  defineOptions({ name: 'TmsReportVehicleProfit' })
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
  } = useReportQuery('vehicle-profit', 'month')
  const chart = computed(() => financialComparison(overview.trend))
  const note =
    '承运吨数与方量按有效执行运单逐笔归集，缺失值待核算，不按整单货量分配给车辆或司机。按订单创建日期统计有效执行运单，成本只含已审核费用。油费、路费为该范围已归集的对应费用，零表示没有已审核记录，不表示车辆没有发生该项开支；充电、燃气等不混入油费。明细与总额均遵循字段权限。期间保险摊销按保单投保日至到期日（含首尾日）平均分摊，取与查询日期重叠的天数，商业险与交强险相加；无期间保单、日期或保费缺失时待核算。该列按车辆和自然日期计算，尚未分配到订单，也未重复加入已归集成本。工资、维修、保险、折旧尚未完整分摊，毛利不等于净利润。一单多执行运单且缺少收入分摊时，营收与毛利留空。'
  const metrics = computed(() => financialMetrics(overview.summary, overview.loading, '分析车辆'))
  const columnsFactory = (): ColumnOption<ReportRow>[] => [
    {
      ...linkColumn('label', '车牌', router, (row) => ({
        name: 'TmsReportOrderProfit',
        query: {
          keyword: String(row.label),
          start: appliedSearch.dates[0],
          end: appliedSearch.dates[1]
        }
      })),
      fixed: 'left'
    },
    textColumn('driver', '所属司机'),
    numberColumn('weight_tons', '承运运量（吨）'),
    numberColumn('volume', '承运方量（m³）'),
    ...profitMeasureColumns,
    numberColumn('fuel_cost', '已归集油费（元）', 170),
    numberColumn('toll_cost', '已归集路费（元）', 170),
    ...insuranceAllocationColumns,
    ...payrollAllocationColumns,
    numberColumn('insurance_period_cost', '期间保险摊销（元）', 190)
  ]
</script>
