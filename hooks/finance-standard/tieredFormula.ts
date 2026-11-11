export type MeterUsage = 'WATER_USAGE' | 'ELECTRICITY_USAGE' | 'GAS_USAGE'
export interface TierPrice {
  upper: string | null
  price: string | null
}
export interface TieredFormula {
  usage: MeterUsage
  tiers: TierPrice[]
  formula: string
}
export const meterBase = (usage: MeterUsage) => '${STANDARD_PRICE}*${' + usage + '}'
export function meterFormulaValid(formula: string, usage: MeterUsage) {
  const compact = formula.replace(/\s+/g, '')
  const base = meterBase(usage)
  const suffix = compact.slice(base.length)
  return (
    compact.startsWith(base) &&
    (!suffix || /^[+*/-]/.test(suffix)) &&
    !/\$\{(?:STANDARD_PRICE|WATER_USAGE|ELECTRICITY_USAGE|GAS_USAGE|PERIOD_MONTHS)\}|TIERED/.test(suffix)
  )
}
const amount = /^[0-9]{1,18}(\.[0-9]{1,2})?$/
const quantity = /^[0-9]{1,18}(\.[0-9]{1,6})?$/
const units = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'))
}
/** 档位仅保存一份规范公式；首档价沿用标准单价，后续价格随表达式冻结到历史快照。 */
export function encodeTieredFormula(usage: MeterUsage, tiers: TierPrice[], formula = meterBase(usage)): string {
  if (!['WATER_USAGE', 'ELECTRICITY_USAGE', 'GAS_USAGE'].includes(usage) || !tiers.length || tiers.length > 10)
    throw new Error('Standard.tierInvalid')
  if (!meterFormulaValid(formula, usage)) throw new Error('Standard.meterFormulaRequired')
  let lower = 0n
  const args = [meterBase(usage)]
  tiers.forEach((row, index) => {
    if (row.price == null || !amount.test(row.price)) throw new Error('Standard.tierInvalid')
    if (index === tiers.length - 1) {
      if (row.upper != null) throw new Error('Standard.tierInvalid')
    } else {
      if (row.upper == null || !quantity.test(row.upper) || units(row.upper) <= lower)
        throw new Error('Standard.tierInvalid')
      lower = units(row.upper)
      args.push(row.upper, tiers[index + 1].price ?? '')
    }
  })
  return 'TIERED(' + args.join(',') + ')' + formula.replace(/\s+/g, '').slice(meterBase(usage).length)
}
/** 只识别受限完整阶梯表达式，普通或不可还原公式不能误判成阶梯编辑草稿。 */
export function decodeTieredFormula(expression: string, firstPrice: string | null): TieredFormula | null {
  const compact = expression.replace(/\s+/g, '')
  const match =
    compact.match(/^TIERED\(\$\{STANDARD_PRICE\}\*\$\{(WATER_USAGE|ELECTRICITY_USAGE|GAS_USAGE)\}((?:,[0-9.]+)*)\)(.*)$/) ||
    compact.match(/^TIERED\(\$\{(WATER_USAGE|ELECTRICITY_USAGE|GAS_USAGE)\},\$\{STANDARD_PRICE\}((?:,[0-9.]+)*)\)(.*)$/)
  if (!match) return null
  const values = match[2] ? match[2].slice(1).split(',') : []
  if (values.length % 2) return null
  const tiers: TierPrice[] = []
  let price = firstPrice
  for (let index = 0; index < values.length; index += 2) {
    tiers.push({ upper: values[index], price })
    price = values[index + 1]
  }
  tiers.push({ upper: null, price })
  const usage = match[1] as MeterUsage
  const formula = meterBase(usage) + match[3]
  try {
    encodeTieredFormula(usage, tiers, formula)
    return { usage, tiers, formula }
  } catch {
    return null
  }
}
