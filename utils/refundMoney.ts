import { sumMoney } from './receivableTotals'
import type { PaymentLine } from '../api/financeCashier'
export function refundableMoney(line: PaymentLine) {
  return line.refundReservedAmount && Number(line.refundReservedAmount) > 0
    ? '0.00'
    : sumMoney([line.amount, `-${line.refundedAmount || '0'}`])
}
