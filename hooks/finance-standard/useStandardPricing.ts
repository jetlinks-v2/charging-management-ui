import { computed, reactive, watch } from 'vue'
import { decodeTieredFormula, encodeTieredFormula, meterBase, type TierPrice, type MeterUsage } from './tieredFormula'
type PricingModel = { billingMethod: string; formulaExpression: string; price: string | null; settlementMethod: string }
export function useStandardPricing(model: PricingModel) {
  const state = reactive({ tiers: [] as TierPrice[], formula: '', invalid: false })
  const isMeter = computed(() => ['WATER', 'ELECTRICITY', 'GAS'].includes(model.billingMethod))
  const usage = computed<MeterUsage>(() =>
    model.billingMethod === 'ELECTRICITY' ? 'ELECTRICITY_USAGE' : model.billingMethod === 'GAS' ? 'GAS_USAGE' : 'WATER_USAGE'
  )
  const unit = computed(() => (model.billingMethod === 'ELECTRICITY' ? 'kW·h' : 'm³'))
  const base = computed(() => meterBase(usage.value))
  let restoring = false
  function sync() {
    if (restoring || !isMeter.value) return
    model.price = state.tiers[0]?.price ?? null
    model.settlementMethod = 'MONTHLY'
    try {
      model.formulaExpression = encodeTieredFormula(usage.value, state.tiers, state.formula)
      state.invalid = false
    } catch {
      // 不保留上次有效表达式，否则未填完的阶梯会按旧价提交。
      model.formulaExpression = ''
      state.invalid = true
    }
  }
  function restore() {
    restoring = true
    const saved = decodeTieredFormula(model.formulaExpression, model.price)
    state.tiers = saved?.tiers || [{ upper: null, price: model.price }]
    state.formula = saved?.formula || model.formulaExpression || base.value
    state.invalid = false
    restoring = false
  }
  function setFormula(value: string) {
    state.formula = value
  }
  function addTier() {
    if (state.tiers.length >= 10) return
    state.tiers = [
      ...state.tiers.map((row, index) => (index === state.tiers.length - 1 ? { ...row, upper: '' } : row)),
      { upper: null, price: null }
    ]
  }
  function removeTier(index: number) {
    if (state.tiers.length <= 1) return
    state.tiers = state.tiers
      .filter((_, current) => current !== index)
      .map((row, current, rows) => (current === rows.length - 1 ? { ...row, upper: null } : row))
  }
  function validate() {
    sync()
    return !state.invalid
  }
  watch([() => state.tiers, () => state.formula], sync, { deep: true, flush: 'sync' })
  return reactive({ state, isMeter, usage, base, unit, restore, setFormula, addTier, removeTier, validate })
}
export type StandardPricing = ReturnType<typeof useStandardPricing>
