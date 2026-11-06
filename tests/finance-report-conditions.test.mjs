import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const output = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-report/reportConditions.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
})
const m = { exports: {} }
new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), m, m.exports)
const { reportConditions } = m.exports
const allowed = { customerName: 'like', collectionStatus: 'eq' }
test('报表筛选保留业务白名单，清除字段重置为undefined', () => {
  assert.deepEqual(
    reportConditions([{ terms: [{ column: 'customerName', termType: 'like', value: '张' }] }], allowed),
    { customerName: '张', collectionStatus: undefined }
  )
  assert.deepEqual(reportConditions([], allowed), { customerName: undefined, collectionStatus: undefined })
})
test('拒绝无法无损映射的OR、重复字段、未知字段与比较操作符', () => {
  for (const terms of [
    [{ column: 'customerName', termType: 'like', value: '张', type: 'or' }],
    [
      { column: 'customerName', termType: 'like', value: '张' },
      { column: 'customerName', termType: 'like', value: '李' }
    ],
    [{ column: 'projectIds', termType: 'eq', value: 'secret' }],
    [{ column: 'customerName', termType: 'not', value: '张' }]
  ])
    assert.throws(() => reportConditions(terms, allowed))
})

test('日期区间映射为接口自然日起止，清除条件同步清空两端', () => {
  const ranges = { receivedDate: ['receivedDateStart', 'receivedDateEnd'] }
  assert.deepEqual(
    reportConditions(
      [
        {
          column: 'receivedDate',
          termType: 'btw',
          value: [new Date(2026, 10, 1).getTime(), new Date(2026, 10, 7).getTime()]
        }
      ],
      allowed,
      ranges
    ),
    {
      customerName: undefined,
      collectionStatus: undefined,
      receivedDateStart: '2026-11-01',
      receivedDateEnd: '2026-11-07'
    }
  )
  assert.deepEqual(reportConditions([], allowed, ranges), {
    customerName: undefined,
    collectionStatus: undefined,
    receivedDateStart: undefined,
    receivedDateEnd: undefined
  })
})

test('拒绝反向、无效、不完整及重复的日期区间', () => {
  const ranges = { invoiceDate: ['invoiceDateStart', 'invoiceDateEnd'] }
  for (const value of [
    ['2026-11-07', '2026-11-01'],
    ['2026-02-30', '2026-03-01'],
    ['2026-11-01'],
    [null, '2026-11-07']
  ])
    assert.throws(() => reportConditions([{ column: 'invoiceDate', termType: 'btw', value }], allowed, ranges))
  const range = { column: 'invoiceDate', termType: 'btw', value: ['2026-11-01', '2026-11-07'] }
  assert.throws(() => reportConditions([range, range], allowed, ranges))
  assert.throws(() => reportConditions([{ ...range, type: 'or' }], allowed, ranges))
})
