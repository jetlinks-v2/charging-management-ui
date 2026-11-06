/** 税率仅作展示格式化，不参与任何计税或金额计算。 */
export function formatDocumentRate(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const rate = Number(value)
  return Number.isFinite(rate)
    ? new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 6 }).format(rate)
    : '—'
}
