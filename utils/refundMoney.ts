import { sumMoney } from './receivableTotals'
import type { PaymentLine } from '../api/financeCashier'
export function refundableMoney(line: PaymentLine) {
  return sumMoney([line.amount, `-${line.refundedAmount || '0'}`])
}
