import type { DocumentCandidate, DocumentItem } from '../api/financeDocument'
import { sumMoney } from './receivableTotals'
import dayjs from 'dayjs'

export const documentSourceKey = (row: Pick<DocumentCandidate, 'sourceType' | 'sourceId'>) =>
  `${row.sourceType}:${row.sourceId}`

/** 同批票据使用同一销方、客户的冻结来源，跨页选择不重复领临时款额度。 */
export function canSelectDocument(row: DocumentCandidate, selected: DocumentCandidate[]) {
  const first = selected[0]
  return row.selectable && (!first || (row.customerId === first.customerId && row.companyId === first.companyId))
}
export function documentItem(row: DocumentCandidate): DocumentItem {
  return {
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    amount: row.availableAmount,
    collectionMethod: 'FULL',
    differenceAmount: '0.00'
  }
}
export function validDocumentAmount(item: DocumentItem, candidate: DocumentCandidate) {
  try {
    const value = sumMoney([item.amount])
    if (value === '0.00' || value.startsWith('-')) return false
    // 金额以整数分比较，避免JS浮点或Number上限影响可开额度判断。
    return BigInt(value.replace('.', '')) <= BigInt(sumMoney([candidate.availableAmount]).replace('.', ''))
  } catch {
    return false
  }
}

export function validDocumentDeduction(item: DocumentItem) {
  try {
    if (item.collectionMethod === 'FULL') return !item.voucher && sumMoney([item.differenceAmount]) === '0.00'
    const cents = (value: string) => BigInt(sumMoney([value]).replace('.', ''))
    const difference = cents(item.differenceAmount),
      voucher = item.voucher
    if (
      difference <= 0n ||
      difference >= cents(item.amount) ||
      !voucher ||
      !['05', '06', '09', '10', '11', '12', '13', '14', '15', '16'].includes(voucher.type)
    )
      return false
    if (
      !voucher.attachmentFileId ||
      !voucher.attachmentFileName ||
      cents(voucher.amount) < difference ||
      !/^\d{4}-\d{2}-\d{2}$/.test(voucher.date) ||
      dayjs(voucher.date).format('YYYY-MM-DD') !== voucher.date
    )
      return false
    if (['10', '11'].includes(voucher.type))
      return !!(
        voucher.electronicInvoiceNumber?.trim() ||
        (voucher.invoiceCode?.trim() && voucher.invoiceNumber?.trim())
      )
    return !!voucher.number?.trim() && (voucher.type !== '09' || !!voucher.remark?.trim())
  } catch {
    return false
  }
}
