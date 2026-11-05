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
