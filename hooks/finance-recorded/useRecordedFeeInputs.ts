import type { RecordedInput, SettlementTier } from '../../api/financeRecorded'
type NumericInput = number | string | null | undefined
const numberOrNull = (value: NumericInput) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
export function useRecordedFeeInputs(model: () => RecordedInput) {
  const fixed = (value: NumericInput) => {
    model().fixedAmount = numberOrNull(value)
  }
  const minimum = (value: NumericInput) => {
    model().minimumFee = numberOrNull(value)
  }
  const maximum = (value: NumericInput) => {
    model().maximumFee = numberOrNull(value)
  }
  const upper = (row: SettlementTier, value: NumericInput) => {
    row.maximumAmount = numberOrNull(value)
  }
  const rate = (row: SettlementTier, value: NumericInput) => {
    row.procedureRate = numberOrNull(value)
  }
  return { fixed, minimum, maximum, upper, rate }
}
