export function formatRateAddress(region?: string | null, address?: string | null): string {
  return [region, address].filter(Boolean).join(' ') || '--'
}
