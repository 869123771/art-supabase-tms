import type { ReportTrendPoint } from '../../../api/modules/management-reports'
import { reportNumber } from './report-cells'
/** Keep each readable measure; unknown or restricted values remain gaps, never zero. */
export function financialComparison(trend: ReportTrendPoint[]) {
  const points = trend
    .filter((point) => typeof point.revenue === 'number' || typeof point.cost === 'number')
    .slice(0, 6)
  return {
    labels: points.map((point) => point.label),
    series: [
      { name: '营收', data: points.map((point) => point.revenue) },
      { name: '已归集成本', data: points.map((point) => point.cost) }
    ],
    unit: '元',
    axisUnit: '万元',
    divisor: 10000,
    description: points
      .map(
        (point) =>
          point.label +
          '：营收 ' +
          reportNumber(point.revenue) +
          ' 元，已归集成本 ' +
          reportNumber(point.cost) +
          ' 元'
      )
      .join('；')
  }
}
