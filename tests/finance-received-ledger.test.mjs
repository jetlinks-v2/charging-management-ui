import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'

const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-cashier/useReceivedLedger.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'ledger-boundaries',
      setup(b) {
        b.onResolve(
          { filter: /financeReceivedLedger|useFinanceSpaceScope|useReportExport|@jetlinks-web\/utils|vue-i18n/ },
          (a) => ({ path: a.path, namespace: 'mock' })
        )
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeReceivedLedger')
            ? 'export const queryReceivedLedger=(...a)=>globalThis.__ledger.query(...a); export const exportReceivedLedger=()=>{}'
            : a.path.includes('useFinanceSpaceScope')
            ? 'export const flattenSpaces=rows=>rows.flatMap(row=>[row,...flattenSpaces(row.children||[])])'
            : a.path.includes('useReportExport')
            ? 'import {ref} from "vue"; export const useReportExport=options=>({exporting:ref(false),exportRows:()=>options.input()})'
            : a.path === 'vue-i18n'
            ? 'export const useI18n=()=>({t:k=>k})'
            : 'export const onlyMessage=(...a)=>globalThis.__ledger.messages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const term = (column, value) => ({ column, value, termType: 'like', type: 'and' })
const change = (terms) => ({ filter: { terms } })
function setup() {
  const calls = []
  globalThis.__ledger = {
    messages: [],
    query: async (...args) => {
      calls.push(args)
      return { page: { data: [], total: 0 } }
    }
  }
  const archive = { projectId: ref('project-a'), selected: ref({ id: 'building', children: [{ id: 'room' }] }) }
  return { state: mod.exports.useReceivedLedger(archive), calls }
}

test('JetLinks条件搜索与分页导出保持相同筛选和空间范围，清空后删除全部条件', async () => {
  const { state, calls } = setup()
  state.filter(
    change([
      term('fullName', '5G园区/1栋'),
      term('customerName', '龚超'),
      term('collectorName', '收费员'),
      { ...term('handoverState', 'PENDING'), termType: 'eq' }
    ])
  )
  await state.request({ pageIndex: 2, pageSize: 24 })
  const payload = calls[0][1]
  assert.equal(payload.fullName, '5G园区/1栋')
  assert.equal(payload.customerName, '龚超')
  assert.equal(payload.collectorName, '收费员')
  assert.equal(payload.handoverState, 'PENDING')
  assert.deepEqual(payload.projectIds, ['project-a'])
  assert.deepEqual(payload.spaceIds, ['building', 'room'])
  assert.equal(payload.pageIndex, 2)
  assert.equal(payload.pageSize, 24)
  const exported = state.exportRows()
  assert.equal(exported.customerName, payload.customerName)
  assert.equal(exported.handoverState, payload.handoverState)
  assert.deepEqual(exported.spaceIds, payload.spaceIds)
  state.filter(change([]))
  await state.request({ pageIndex: 0 })
  for (const key of ['fullName', 'customerName', 'collectorName', 'handoverState'])
    assert.equal(calls[1][1][key], undefined)
})

test('不支持的OR和重复字段提示警告并保留已应用条件，导出期间不修改范围', () => {
  const { state } = setup()
  state.filter(change([term('customerName', '原条件')]))
  state.filter(change([{ ...term('customerName', '越界'), type: 'or' }]))
  assert.equal(state.input.value.customerName, '原条件')
  state.filter(change([term('customerName', '甲'), term('customerName', '乙')]))
  assert.equal(state.input.value.customerName, '原条件')
  assert.equal(globalThis.__ledger.messages.length, 2)
  state.exporting.value = true
  state.filter(change([]))
  assert.equal(state.input.value.customerName, '原条件')
})
