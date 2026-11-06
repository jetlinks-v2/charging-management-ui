import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../utils/financeTime.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs'
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const { formatFinanceTime } = mod.exports

test('交账时间的小数秒和普通时间都只显示到分钟，不四舍五入', () => {
  for (const value of ['2026-11-06T16:46:33.009192800', '2026-11-06T16:46:59.999999999', '2026-11-06 16:46:33', '2026-11-06T16:46']) {
    assert.equal(formatFinanceTime(value), '2026-11-06 16:46')
  }
})

test('毫秒时间戳与带时区的时间按本地时间展示，日期字段不增加零点时间', () => {
  const timestamp = new Date(2026, 10, 6, 16, 46, 33).getTime()
  assert.equal(formatFinanceTime(timestamp), '2026-11-06 16:46')
  assert.equal(formatFinanceTime(new Date(timestamp).toISOString()), '2026-11-06 16:46')
  assert.equal(formatFinanceTime('2026-11-06'), '2026-11-06')
})

test('空值与无效值显示占位符，不显示 Invalid Date 或当前时间', () => {
  for (const value of [undefined, null, '', 'invalid', NaN]) assert.equal(formatFinanceTime(value), '—')
  assert.notEqual(formatFinanceTime(0), '—')
})
