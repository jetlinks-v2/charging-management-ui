import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../utils/settingFormulaValues.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs'
})
const module = { exports: {} }
new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports)
const { settingFormulaValues } = module.exports
const standard = (method = 'MONTHLY') => ({
  price: '999999999999999999.99',
  settlementMethod: method,
  variablesSnapshot: ['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS', 'BILLING_PERSON'].map((code) => ({
    variableCode: code,
    variableName: code
  }))
})
const values = (rows) => Object.fromEntries(rows.map((row) => [row.code, row.value]))

test('monthly and quarterly display complete-period months, independent of setting duration', () => {
  assert.equal(values(settingFormulaValues(standard(), { billingArea: '100.25' })).PERIOD_MONTHS, '1')
  assert.equal(values(settingFormulaValues(standard('QUARTERLY'), { billingArea: '100.25' })).PERIOD_MONTHS, '3')
})

test('price precision, each house area and editable zero are preserved', () => {
  const input = { BILLING_PERSON: '0' }
  const first = settingFormulaValues(standard(), { billingArea: '100.25' }, input)
  const second = settingFormulaValues(standard(), { billingArea: '86.50' }, input)
  assert.equal(values(first).STANDARD_PRICE, '999999999999999999.99')
  assert.equal(values(first).BILLING_AREA, '100.25')
  assert.equal(values(second).BILLING_AREA, '86.50')
  assert.equal(values(first).BILLING_PERSON, '0')
  assert.deepEqual(
    first.map((row) => row.readonly),
    [true, true, true, false]
  )
  assert.deepEqual(input, { BILLING_PERSON: '0' }, 'display must not write trusted values into save payload')
})

test('details use saved variable values even if other source values differ', () => {
  const snapshot = { STANDARD_PRICE: '2.00', BILLING_AREA: '90.00', BILLING_PERSON: '2', PERIOD_MONTHS: '99' }
  const displayed = values(settingFormulaValues(standard('QUARTERLY'), { billingArea: '110.00' }, snapshot))
  assert.deepEqual(displayed, {
    STANDARD_PRICE: '2.00',
    BILLING_AREA: '90.00',
    BILLING_PERSON: '2',
    PERIOD_MONTHS: '3'
  })
  assert.equal(snapshot.PERIOD_MONTHS, '99', 'period reference does not mutate historic data')
})

test('missing data remains visible and unknown settlement never defaults to a month', () => {
  const displayed = values(settingFormulaValues({ ...standard('UNKNOWN'), price: null }))
  assert.deepEqual(displayed, { STANDARD_PRICE: '—', BILLING_AREA: '—', PERIOD_MONTHS: '—', BILLING_PERSON: '—' })
  assert.equal(values(settingFormulaValues(standard(), { billingArea: 0 })).BILLING_AREA, '0')
})
