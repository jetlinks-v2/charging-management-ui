import type { FormulaVariable } from '../../api/financeStandard'
/** 展示只替换完整变量占位，不执行表达式；未知编码保留以便后端明确报错。 */
export function formulaDisplay(
  expression: string,
  variables: Pick<FormulaVariable, 'variableCode' | 'variableName'>[]
) {
  const names = new Map(variables.map((row) => [row.variableCode, row.variableName]))
  return (
    '[费用_金额]=' +
    expression.replace(/\$\{([A-Z][A-Z0-9_]*)\}/g, (token, code: string) =>
      names.has(code) ? '[' + names.get(code) + ']' : token
    )
  )
}
