import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
const require = createRequire(import.meta.url)
async function load(path) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue']
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { encodeTieredFormula, decodeTieredFormula } = await load('../hooks/finance-standard/tieredFormula.ts')
const { useStandardPricing } = await load('../hooks/finance-standard/useStandardPricing.ts')
const tiers = () => [
  { upper: '10', price: '3.00' },
  { upper: '20', price: '4.00' },
  { upper: null, price: '5.00' }
]

test('gas restores editable tiers and a protected gas formula; rejects other energy variables', () => {
  const model = reactive({ billingMethod: 'GAS', price: '2.50', settlementMethod: 'MONTHLY',
    formulaExpression: 'TIERED(${STANDARD_PRICE}*${GAS_USAGE},20,3.20,40,4.00)' })
  const vm = useStandardPricing(model)
  vm.restore()
  assert.equal(vm.isMeter, true)
  assert.equal(vm.unit, 'm³')
  assert.equal(vm.usage, 'GAS_USAGE')
  assert.deepEqual(vm.state.tiers, [{ upper: '20', price: '2.50' }, { upper: '40', price: '3.20' }, { upper: null, price: '4.00' }])
  vm.setFormula('${STANDARD_PRICE}*${GAS_USAGE}*0.9+2')
  assert.equal(vm.validate(), true)
  assert.equal(model.formulaExpression, 'TIERED(${STANDARD_PRICE}*${GAS_USAGE},20,3.20,40,4.00)*0.9+2')
  for (const suffix of ['+${WATER_USAGE}', '+${ELECTRICITY_USAGE}', '*${PERIOD_MONTHS}', '+${GAS_USAGE}']) {
    vm.setFormula('${STANDARD_PRICE}*${GAS_USAGE}' + suffix)
    assert.equal(vm.validate(), false)
    assert.equal(model.formulaExpression, '')
  }
  vm.setFormula('${STANDARD_PRICE}+${GAS_USAGE}')
  assert.equal(vm.validate(), false)
  assert.equal(decodeTieredFormula('TIERED(${STANDARD_PRICE}*${WATER_USAGE})+${GAS_USAGE}', '3'), null)
  assert.equal(encodeTieredFormula('GAS_USAGE', [{ upper: null, price: '2.50' }]), 'TIERED(${STANDARD_PRICE}*${GAS_USAGE})')
})
test('tier rules round trip exact decimal strings and distinguish fixed formulas', () => {
  const expression = encodeTieredFormula('WATER_USAGE', tiers())
  assert.equal(expression, 'TIERED(${STANDARD_PRICE}*${WATER_USAGE},10,4.00,20,5.00)')
  assert.deepEqual(decodeTieredFormula(expression, '3.00'), {
    usage: 'WATER_USAGE',
    tiers: tiers(),
    formula: '${STANDARD_PRICE}*${WATER_USAGE}'
  })
  assert.equal(decodeTieredFormula('${STANDARD_PRICE}*${BILLING_AREA}', '3'), null)
  assert.equal(
    encodeTieredFormula('ELECTRICITY_USAGE', [{ upper: null, price: '999999999999999999.99' }]),
    'TIERED(${STANDARD_PRICE}*${ELECTRICITY_USAGE})'
  )
})
test('tier rules reject missing prices, repeated thresholds, discontinuities and unsafe expressions', () => {
  for (const rows of [
    [],
    [{ upper: '10', price: '3' }],
    [
      { upper: '0', price: '3' },
      { upper: null, price: '4' }
    ],
    [
      { upper: '10', price: '3' },
      { upper: '10', price: '4' },
      { upper: null, price: '5' }
    ],
    [
      { upper: null, price: '3' },
      { upper: null, price: '5' }
    ],
    [{ upper: null, price: '0.001' }],
    [{ upper: null, price: '-1' }],
    [{ upper: null, price: null }]
  ]) {
    assert.throws(() => encodeTieredFormula('WATER_USAGE', rows))
  }
  assert.throws(() => encodeTieredFormula('BILLING_AREA', tiers()))
  assert.equal(decodeTieredFormula('TIERED(${WATER_USAGE},${STANDARD_PRICE},10,4)+${WATER_USAGE}', '3'), null)
})
test('property fee remains unchanged; choosing water directly exposes tiers and a protected editable formula', () => {
  const model = reactive({
    billingMethod: 'AREA',
    formulaExpression: '${STANDARD_PRICE}*${BILLING_AREA}*${PERIOD_MONTHS}',
    price: '2.50',
    settlementMethod: 'MONTHLY'
  })
  const vm = useStandardPricing(model)
  vm.restore()
  assert.equal(vm.isMeter, false)
  assert.equal(vm.validate(), true)
  assert.equal(model.price, '2.50')
  model.billingMethod = 'WATER'
  model.formulaExpression = '${STANDARD_PRICE}*${WATER_USAGE}'
  vm.restore()
  assert.deepEqual(vm.state.tiers, [{ upper: null, price: '2.50' }])
  vm.state.tiers = tiers()
  assert.equal(vm.validate(), true)
  assert.equal(model.price, '3.00')
  assert.equal(model.formulaExpression, 'TIERED(${STANDARD_PRICE}*${WATER_USAGE},10,4.00,20,5.00)')
  vm.setFormula('${STANDARD_PRICE}*${WATER_USAGE}*0.9+2')
  assert.equal(model.formulaExpression, 'TIERED(${STANDARD_PRICE}*${WATER_USAGE},10,4.00,20,5.00)*0.9+2')
  vm.state.tiers[0].upper = '11'
  assert.equal(model.formulaExpression, 'TIERED(${STANDARD_PRICE}*${WATER_USAGE},11,4.00,20,5.00)*0.9+2')
})
test('opening a saved electricity tier restores rows and invalid drafts cannot submit stale formulas', () => {
  const model = reactive({
    billingMethod: 'ELECTRICITY',
    formulaExpression: 'TIERED(${ELECTRICITY_USAGE},${STANDARD_PRICE},100,0.70)',
    price: '0.56',
    settlementMethod: 'MONTHLY'
  })
  const vm = useStandardPricing(model)
  vm.restore()
  assert.equal(vm.state.formula, '${STANDARD_PRICE}*${ELECTRICITY_USAGE}')
  assert.deepEqual(vm.state.tiers, [
    { upper: '100', price: '0.56' },
    { upper: null, price: '0.70' }
  ])
  vm.state.tiers[0].upper = '0'
  assert.equal(vm.validate(), false)
  assert.equal(model.formulaExpression, '')
  vm.state.tiers[0].upper = '100'
  vm.addTier()
  assert.equal(vm.state.tiers.at(-1).upper, null)
  assert.equal(vm.validate(), false)
  vm.removeTier(1)
  vm.state.tiers.at(-1).price = '0.70'
  assert.equal(vm.validate(), true)
})
test('one unlimited tier supports a flat price and the protected product cannot be replaced or repeated', () => {
  const model = reactive({
    billingMethod: 'WATER',
    formulaExpression: '${STANDARD_PRICE}*${WATER_USAGE}',
    price: null,
    settlementMethod: 'MONTHLY'
  })
  const vm = useStandardPricing(model)
  vm.restore()
  vm.state.tiers[0].price = '3.25'
  assert.equal(vm.state.tiers[0].price, '3.25')
  assert.equal(vm.validate(), true)
  assert.equal(model.formulaExpression, 'TIERED(${STANDARD_PRICE}*${WATER_USAGE})')
  for (const expression of [
    '${STANDARD_PRICE}+${WATER_USAGE}',
    '${STANDARD_PRICE}*${WATER_USAGE}+${WATER_USAGE}',
    '${STANDARD_PRICE}*${ELECTRICITY_USAGE}'
  ]) {
    vm.setFormula(expression)
    assert.equal(vm.validate(), false)
    assert.equal(model.formulaExpression, '')
  }
})

test('new stored tier expressions restore both the tier rows and appended formula', () => {
  const formula = '${STANDARD_PRICE}*${ELECTRICITY_USAGE}*0.9+2'
  const encoded = encodeTieredFormula('ELECTRICITY_USAGE', tiers(), formula)
  assert.deepEqual(decodeTieredFormula(encoded, '3.00'), { usage: 'ELECTRICITY_USAGE', tiers: tiers(), formula })
})
