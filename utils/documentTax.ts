import type { DocumentCandidate, DocumentItem } from '../api/financeDocument'

const fixed = (value: bigint, scale: number) => {
  const digits = value.toString().padStart(scale + 1, '0')
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
}
const round = (numerator: bigint, denominator: bigint) => (numerator + denominator / 2n) / denominator

/** 仅供填写时预估，确认仍以后端预览为准；与后端一致先除至12位，再计算6位销项税。 */
export function estimateDocumentTax(item: DocumentItem, source: DocumentCandidate): string {
  const decimal = (value: string, scale: number) => {
    if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(value)) throw Error('invalid decimal')
    const [whole, fraction = ''] = value.split('.')
    return BigInt(whole + fraction.padEnd(scale, '0'))
  }
  try {
    const gross = decimal(source.availableAmount, 2),
      rate = decimal(source.taxRate, 6)
    const difference = item.collectionMethod === 'DIFFERENTIAL' ? decimal(item.differenceAmount, 2) : 0n
    if (gross <= 0n || rate > 1000000n || difference < 0n || difference >= gross) return '—'
    const base = round((gross - difference) * 10000000000000000n, 1000000n + rate)
    return fixed(round(base * rate, 1000000000000n), 6)
  } catch {
    return '—'
  }
}

export function buildDocumentRemark(
  sources: DocumentCandidate[],
  items: DocumentItem[],
  label: (key: string) => string
): string {
  return sources
    .map((source, index) => {
      const item = items[index]
      return [
        `${label('startDate')}：${source.startDate || '—'}`,
        `${label('endDate')}：${source.endDate || '—'}`,
        `${label('subject')}：${source.subjectName}`,
        `${label('amount')}：￥${source.availableAmount}`,
        `${label('customer')}：${source.customerName}`,
        ...(item?.collectionMethod === 'DIFFERENTIAL' ? [`${label('difference')}：￥${item.differenceAmount}`] : [])
      ].join('\n')
    })
    .join('\n\n')
}
