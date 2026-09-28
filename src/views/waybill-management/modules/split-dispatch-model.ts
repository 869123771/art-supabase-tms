import { round } from 'lodash-es'

export type SplitBasis = 'quantity' | 'weight' | 'volume'

export interface SplitLineInput {
  lineIndex: number
  amount: number
}

export function splitBasisValue(item: Api.Tms.Order.CargoItem, basis: SplitBasis): number {
  const key = basis === 'weight' ? 'weightKg' : basis === 'volume' ? 'volumeM3' : 'quantity'
  return Number(item[key] ?? 0)
}

export function buildSplitLines(
  source: Api.Tms.Order.CargoItem[],
  basis: SplitBasis,
  inputs: SplitLineInput[]
): Api.Tms.Waybill.DispatchAllocationLine[] {
  return inputs.flatMap(({ lineIndex, amount }) => {
    const item = source[lineIndex]
    const base = item ? splitBasisValue(item, basis) : 0
    if (!item || !Number.isFinite(amount) || amount <= 0 || base <= 0) return []
    const ratio = amount / base
    return [
      {
        lineIndex,
        quantity: round(Number(item.quantity ?? 0) * ratio, 6),
        weightKg: round(Number(item.weightKg ?? 0) * ratio, 6),
        volumeM3: round(Number(item.volumeM3 ?? 0) * ratio, 6)
      }
    ]
  })
}

export function validateSplitInputs(
  source: Api.Tms.Order.CargoItem[],
  basis: SplitBasis,
  parts: SplitLineInput[][],
  minimumParts = 2
): string | null {
  if (parts.length < minimumParts)
    return minimumParts === 1 ? '请至少设置一个续拆批次' : '首次拆单至少需要两个执行批次'
  if (parts.some((part) => !part.some((line) => Number(line.amount) > 0)))
    return '每个执行批次都需要分配货量'
  for (let index = 0; index < source.length; index += 1) {
    const available = splitBasisValue(source[index], basis)
    const assigned = parts.reduce(
      (sum, part) => sum + Number(part.find((line) => line.lineIndex === index)?.amount ?? 0),
      0
    )
    if (assigned > available + 0.000001) return `第 ${index + 1} 行货物分配量超过剩余量`
    if (assigned < 0 || !Number.isFinite(assigned)) return `第 ${index + 1} 行货物分配量无效`
  }
  return null
}
