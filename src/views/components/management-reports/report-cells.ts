import { h } from 'vue'
import { RouterLink, type RouteLocationRaw, type Router } from 'vue-router'
import { ElTag } from 'element-plus'
import type { ColumnOption } from '@/types'
import { formatNumberValue } from '@/utils/ui/format'
import type { ReportRow } from '../../../api/modules/management-reports'
export const reportNumber = (value: unknown) =>
  typeof value === 'number'
    ? formatNumberValue(value, 'zh-CN', { maximumFractionDigits: 2 })
    : '待核算'
export function textColumn(prop: string, label: string, width = 160): ColumnOption<ReportRow> {
  return {
    prop,
    label,
    minWidth: width,
    showOverflowTooltip: true,
    formatter: (row) => String(row[prop] ?? '—')
  }
}
export function numberColumn(prop: string, label: string, width = 145): ColumnOption<ReportRow> {
  return {
    ...textColumn(prop, label, width),
    align: 'right',
    formatter: (row) => reportNumber(row[prop])
  }
}
export function linkColumn(
  prop: string,
  label: string,
  router: Router,
  target: (row: ReportRow) => RouteLocationRaw | null,
  width = 210
): ColumnOption<ReportRow> {
  return {
    ...textColumn(prop, label, width),
    formatter: (row) => {
      const value = String(row[prop] ?? '未关联'),
        to = target(row)
      const resolved = to ? router.resolve(to) : null
      return to && resolved?.matched.length
        ? h(
            RouterLink,
            { to, class: 'font-medium text-theme focus-visible:outline-2' },
            () => value
          )
        : value
    }
  }
}
export const profitResultColumn: ColumnOption<ReportRow> = {
  prop: 'result',
  label: '经营结果',
  minWidth: 110,
  formatter: (row) => {
    if (typeof row.profit !== 'number') return '待核算'
    const result =
      row.profit < 0
        ? { type: 'danger' as const, label: '亏损' }
        : row.profit === 0
          ? { type: 'info' as const, label: '保本' }
          : { type: 'success' as const, label: '盈利' }
    return h(ElTag, { type: result.type, effect: 'plain' }, () => result.label)
  }
}
export const receiptStatusColumn: ColumnOption<ReportRow> = {
  ...textColumn('receipt_status', '回单状态', 110),
  formatter: (row) =>
    h(
      ElTag,
      {
        type: ['已上传', '已回收'].includes(String(row.receipt_status)) ? 'success' : 'warning',
        effect: 'plain'
      },
      () => String(row.receipt_status ?? '待核实')
    )
}
export const profitMeasureColumns: ColumnOption<ReportRow>[] = [
  numberColumn('count', '订单数', 100),
  numberColumn('revenue', '营收（元）'),
  numberColumn('cost', '已归集成本（元）'),
  numberColumn('profit', '已归集毛利（元）'),
  numberColumn('margin', '毛利率（%）', 120),
  profitResultColumn
]

export const payrollAllocationColumns: ColumnOption<ReportRow>[] = [
  numberColumn('allocated_payroll', '分摊薪酬（元）', 160),
  textColumn('allocation_basis', '薪酬分摊依据', 150),
  numberColumn('cost_with_payroll', '含薪酬成本（元）', 180),
  numberColumn('profit_after_payroll', '含薪酬毛利（元）', 180)
]

export const payrollAllocationNote =
  ' 薪酬按司机与订单创建月份固定分摊，应发工资加雇主承担费用作为基数；全部运单里程完整且合计大于零时按里程，否则按不同订单数分摊，同单多运单均分。先按整月分摊再筛选，尾差归最后一张运单。含薪酬成本与毛利在原始已归集金额上单列计算，不修改运单费用；仅支持人民币单账套薪酬，缺工资、金额权限或关联时待核算。保险、折旧等尚未完整纳入。'

export const insuranceAllocationColumns: ColumnOption<ReportRow>[] = [
  numberColumn('allocated_insurance', '分摊保险（元）', 160),
  textColumn('insurance_allocation_basis', '保险分摊依据', 150)
]

export const insuranceAllocationNote =
  ' 分摊保险按车辆和订单创建月份计算：整月保费摊销优先按完整执行里程分配，缺里程或合计为零时按不同订单数分配，同单多运单均分，尾差归固定排序最后一单。先分摊再筛选，部分日期查询只取对应订单份额，可能不同于车辆自然日期的期间保险摊销。缺保单、有效日期或保费权限时待核算。分摊保险单列，不直接叠加到已归集成本，以免与已有保险费用重复；无承运订单的车辆成本尚未分配。'
