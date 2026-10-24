<template>
  <ReportWorkspace
    title="司机日常运营台账"
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
  defineOptions({ name: 'TmsReportDriverOperations' })

  const { tableQueryRef, overview, search, searchItems, searchBarProps, tableProps, fetchRows } =
    useReportQuery('driver-operations', 'day')
  const note =
    '一名司机一行；期间任务按运单创建日期，出回场与里程来自执行记录；未完整记录出回场里程则不汇总。考勤通过司机员工关联读取，事故通过司机 ID 关联，违章暂缺可靠司机 ID 不按同名强行匹配。任务数量为运单数，不将多订单运单重复计算。'
  const metrics = computed(() => [
    reportMetric(
      '分析司机',
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
    { ...textColumn('label', '司机姓名'), fixed: 'left' },
    textColumn('driver_no', '司机编号 / 工号'),
    textColumn('plate', '绑定车牌'),
    textColumn('orders', '承运任务', 280),
    textColumn('departure', '出车时间'),
    textColumn('return_time', '回场时间'),
    numberColumn('mileage', '行驶里程（km）'),
    numberColumn('pickups', '提货完成数'),
    numberColumn('completed', '签收完成数'),
    numberColumn('violation', '违章记录数'),
    numberColumn('accident', '事故记录数'),
    numberColumn('receipt', '回单回收数'),
    textColumn('attendance', '出勤状态'),
    textColumn('note', '备注', 280)
  ]
</script>
