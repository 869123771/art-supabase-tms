import type { BusinessWorkspaceMetric } from '@/components/business/business-workspace-header/index.vue'
import type { ReportRow } from '../../../api/modules/management-reports'
import { reportNumber } from './report-cells'
export function reportMetric(
  label: string,
  value: unknown,
  description: string,
  icon: string,
  loading: boolean
): BusinessWorkspaceMetric {
  return { label, value: loading ? '…' : reportNumber(value), description, icon }
}
export function financialMetrics(
  summary: ReportRow,
  loading: boolean,
  dimension: string
): BusinessWorkspaceMetric[] {
  return [
    reportMetric(
      dimension,
      summary.count,
      '当前筛选范围 · 全量统计',
      'ri:bar-chart-box-line',
      loading
    ),
    reportMetric('营收合计', summary.revenue, '元 · 订单收入去重统计', 'ri:funds-line', loading),
    reportMetric('已归集成本', summary.cost, '元 · 已审核的运单费用', 'ri:wallet-3-line', loading),
    reportMetric(
      '已归集毛利',
      summary.profit,
      '元 · 不等同于完整净利润',
      'ri:line-chart-line',
      loading
    )
  ]
}
