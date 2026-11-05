import type { Receivable } from '../api/financeReceivable'

export interface CashierReduction {
  mode: 'AMOUNT' | 'PERCENT'
  value: string
  reason: string
}
export interface CashierNode {
  key: string
  title: string
  amount: string
  arrears: string
  disabled: boolean
  row?: Receivable
  children?: CashierNode[]
}
export function cents(value: string | number) {
  const text = String(value)
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid money')
  const [whole, fraction = ''] = text.replace('-', '').split('.')
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return text.startsWith('-') ? -amount : amount
}
export function money(value: bigint) {
  const absolute = value < 0n ? -value : value
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}
export function collectible(row: Receivable) {
  return (
    row.reviewState === 'APPROVED' &&
    !row.frozen &&
    !row.split &&
    !row.chargeLocked &&
    !row.deletedFlag &&
    !row.paymentLocked &&
    !row.bankCollectionLocked &&
    !row.discountLocked &&
    cents(row.paymentOccupiedAmount || '0') <= 0n &&
    cents(row.arrears) > 0n
  )
}
export function cashierPrincipal(row: Receivable) {
  const value = cents(row.arrears) - cents(row.finalLateFeeAmount || '0')
  return value > 0n ? value : 0n
}
/** 多个收费对象共同对应一笔应收，按账单身份建树，不能为每位客户复制费用。 */
export function buildCashierTree(rows: Receivable[]): CashierNode[] {
  const roots: CashierNode[] = []
  const groups = new Map<string, CashierNode>()
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const customer = row.customerNames?.length ? row.customerNames.join('、') : row.customerName
    const path = [
      row.spaceId,
      [...(row.customerIds || [row.customerId])].sort().join(','),
      `${row.subjectId}:${row.standardId}`,
      row.calcStartDate.slice(0, 4)
    ]
    const labels = [row.fullName, customer, row.subjectName, path[3]]
    let children = roots
    path.forEach((_value, index) => {
      const key = JSON.stringify(path.slice(0, index + 1))
      let node = groups.get(key)
      if (!node) {
        node = { key, title: labels[index], amount: '0.00', arrears: '0.00', disabled: true, children: [] }
        groups.set(key, node)
        children.push(node)
      }
      node.amount = money(cents(node.amount) + cents(row.actualReceivableAmount))
      node.arrears = money(cents(node.arrears) + cashierPrincipal(row))
      if (collectible(row)) node.disabled = false
      children = node.children!
    })
    children.push({
      key: row.id,
      title: `${row.calcStartDate} ~ ${row.calcEndDate}`,
      amount: row.actualReceivableAmount,
      arrears: money(cashierPrincipal(row)),
      disabled: !collectible(row),
      row
    })
  }
  return roots
}
/** 金额按分分配：先取比例整数分，再按余数补齐，避免最后一笔承担全部舍入误差。 */
export function cashierReductions(rows: Receivable[], reduction?: CashierReduction) {
  const bases = rows.map(cashierPrincipal)
  const total = bases.reduce((sum, value) => sum + value, 0n)
  if (!reduction) return rows.map(() => '0.00')
  const value = cents(reduction.value)
  if (value <= 0n || total <= 0n || (reduction.mode === 'PERCENT' && value > 10000n))
    throw new Error('Invalid reduction')
  const discount = reduction.mode === 'PERCENT' ? (total * value + 5000n) / 10000n : value
  const due = rows.reduce((sum, row) => sum + cents(row.arrears), 0n)
  if (discount > total || discount >= due || discount <= 0n) throw new Error('Invalid reduction')
  const amounts = bases.map((base) => (discount * base) / total)
  let remainder = discount - amounts.reduce((sum, amount) => sum + amount, 0n)
  const order = bases
    .map((base, index) => ({ index, rest: (discount * base) % total }))
    .sort((a, b) => (a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1))
  for (const { index } of order) {
    if (!remainder) break
    if (amounts[index] < bases[index]) {
      amounts[index]++
      remainder--
    }
  }
  return amounts.map(money)
}
