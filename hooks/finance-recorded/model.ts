import type { RecordedDetail, RecordedInput } from '../../api/financeRecorded'
export const emptyRecorded = (): RecordedInput => ({
  version: undefined,
  facilitatorId: undefined,
  companyId: '',
  bankId: '',
  sourceCharges: [],
  patternPayments: [],
  serviceChargeType: null,
  minimumFee: null,
  maximumFee: null,
  fixedAmount: null,
  tiers: []
})
export function recordedInput(detail: RecordedDetail): RecordedInput {
  const row = detail.record
  return {
    version: row.version,
    companyId: row.companyId,
    bankId: row.bankId,
    sourceCharges: [row.sourceCharge],
    patternPayments: [row.patternPayment],
    facilitatorId: row.facilitatorId,
    serviceChargeType: row.serviceChargeType ?? null,
    minimumFee: row.minimumFee ?? null,
    maximumFee: row.maximumFee ?? null,
    fixedAmount: row.fixedAmount ?? null,
    tiers: detail.tiers.map(({ minimumAmount, maximumAmount, procedureRate }) => ({
      minimumAmount,
      maximumAmount,
      procedureRate
    }))
  }
}
export function setFeeType(model: RecordedInput, type: 1 | 2 | null) {
  model.serviceChargeType = type
  model.minimumFee = null
  model.maximumFee = null
  model.fixedAmount = type === 2 ? 0 : null
  model.tiers = type === 1 ? [{ minimumAmount: 0, maximumAmount: null, procedureRate: 0 }] : []
}
/** 分界由前一档上限传递，金额始终在一个区间内；最终档无上限。 */
export function appendTier(model: RecordedInput) {
  if (model.tiers.length >= 50) return
  const previous = model.tiers.at(-1)
  if (!previous || previous.maximumAmount === null || previous.maximumAmount <= previous.minimumAmount) return
  model.tiers.push({
    minimumAmount: previous.maximumAmount,
    maximumAmount: null,
    procedureRate: previous.procedureRate
  })
}
export function normalizeRecorded(model: RecordedInput): RecordedInput {
  const input = structuredClone(model)
  if (input.serviceChargeType === null) {
    input.minimumFee = null
    input.maximumFee = null
    input.fixedAmount = null
    input.tiers = []
  } else if (input.serviceChargeType === 2) {
    input.minimumFee = null
    input.maximumFee = null
    input.tiers = []
  } else {
    input.fixedAmount = null
    input.tiers.forEach((tier, index) => {
      tier.minimumAmount = index ? input.tiers[index - 1].maximumAmount! : 0
    })
  }
  return input
}
