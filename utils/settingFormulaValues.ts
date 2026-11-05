import type { HouseInfo } from '../api/financeSetting'
import type { FinanceStandard } from '../api/financeStandard'

/** 展示完整账期的参考月数；不足整期的折算仍由后端按实际日期计算，不作为保存参数。 */
export function settlementMonths(method: string): string | undefined {
  return method === 'MONTHLY' ? '1' : method === 'QUARTERLY' ? '3' : undefined
}

/** 新增读取当前标准和房屋，详情传入冻结快照；十进制原值保持字符串，不在前端算费。 */
export function settingFormulaValues(
  standard: Pick<FinanceStandard, 'price' | 'settlementMethod' | 'variablesSnapshot'>,
  house?: Pick<HouseInfo, 'billingArea'>,
  values: Record<string, string> = {}
) {
  return standard.variablesSnapshot.map((variable) => {
    const code = variable.variableCode
    let value: string | number | null | undefined
    switch (code) {
      case 'STANDARD_PRICE':
        value = values[code] ?? standard.price
        break
      case 'BILLING_AREA':
        value = values[code] ?? house?.billingArea
        break
      case 'PERIOD_MONTHS':
        value = settlementMonths(standard.settlementMethod)
        break
      default:
        value = values[code]
    }
    return {
      code,
      name: variable.variableName,
      readonly: ['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS'].includes(code),
      value: value == null || value === '' ? '—' : String(value)
    }
  })
}
