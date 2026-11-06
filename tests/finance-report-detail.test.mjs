import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
const output = await build({
  entryPoints: [fileURLToPath(new URL('../utils/reportDetail.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
})
const m = { exports: {} }
new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), m, m.exports)
const { reportDetail } = m.exports
const zh = createRequire(import.meta.url)('../locales/lang/zh.json')
const t = (key) => key.split('.').reduce((value, part) => value?.[part], zh) ?? key

test('实收详情排除内部ID和表格元数据，使用中文状态、分钟时间和原始精确金额', () => {
  const detail = reportDetail(
    {
      projectName: '园区',
      sourceType: 'ADVANCE',
      handoverState: 'UNHANDED',
      methodText: '现金',
      receivedAt: '2026-11-07T12:34:56',
      collectorName: '龚超',
      id: 'internal',
      sourceId: 'internal',
      sourceNo: 'ADVANCE-internal',
      method: 'cash',
      collectorId: 'internal',
      index: 1,
      column: {},
      amounts: {
        incomeAmount: '1234567890123456.78',
        refundAmount: '0.00',
        netAmount: '1234567890123456.78',
        currentPeriodAmount: null
      }
    },
    'Received',
    t
  )
  const text = JSON.stringify(detail)
  assert.ok(!/internal|UNHANDED|ADVANCE|\[object Object\]/.test(text))
  assert.equal(detail.basic.find((x) => x.key === 'handoverState').text, '已收未交账')
  assert.equal(detail.basic.find((x) => x.key === 'sourceType').text, '预收款')
  assert.equal(detail.basic.find((x) => x.key === 'receivedAt').text, '2026-11-07 12:34')
  assert.equal(detail.money.find((x) => x.key === 'netAmount').text, '1234567890123456.78 元')
  assert.ok(!detail.money.some((x) => x.key === 'currentPeriodAmount'))
  for (const field of [...detail.basic, ...detail.money])
    assert.notEqual(t(`Received.${field.key}`), `Received.${field.key}`)
})

test('应收详情保留零逾期天数和收缴率，所有业务字段都有中文标签', () => {
  const detail = reportDetail(
    {
      collectionStatus: 'PAID',
      overdueDays: 0,
      dueDate: '2026-11-07',
      amounts: { netAmount: '100.00', collectionRate: '100.00' }
    },
    'Report',
    t
  )
  assert.equal(detail.basic.find((x) => x.key === 'collectionStatus').text, '已收清')
  assert.equal(detail.basic.find((x) => x.key === 'overdueDays').text, '0')
  assert.equal(detail.basic.find((x) => x.key === 'dueDate').text, '2026-11-07')
  assert.equal(detail.money.find((x) => x.key === 'collectionRate').text, '100.00%')
  for (const field of [...detail.basic, ...detail.money])
    assert.notEqual(t(`Report.${field.key}`), `Report.${field.key}`)
})

test('两个报表详情的静态文案及关联发票状态都有翻译', () => {
  for (const file of ['FinanceReceivableReport/ReportRowDetail.vue', 'FinanceInvoiceReport/InvoiceSourceDetail.vue']) {
    const source = readFileSync(new URL(`../views/charging/${file}`, import.meta.url), 'utf8')
    for (const [, key] of source.matchAll(/\bt\('([A-Za-z]+\.[A-Za-z.]+)'\)/g))
      assert.equal(typeof t(key), 'string', `缺少文案 ${key}`), assert.notEqual(t(key), key)
  }
  for (const status of ['SIMULATED_ISSUED', 'SIMULATED_REVERSED', 'SIMULATED_RED'])
    assert.notEqual(t(`Document.status.${status}`), `Document.status.${status}`)
})
