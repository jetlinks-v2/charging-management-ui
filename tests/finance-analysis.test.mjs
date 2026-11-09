import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref } from 'vue'
test('report menu routes and export grants match the business endpoints', () => {
  const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))
  const flatten = (items) => items.flatMap((item) => [item, ...flatten(item.children || [])])
  const all = flatten(menus)
  for (const [name, resource] of [
    ['Receivable', 'receivable'],
    ['Received', 'received'],
    ['Invoice', 'invoice'],
    ['Arrears', 'arrears'],
    ['Monthly', 'monthly'],
    ['Funds', 'funds'],
    ['Activity', 'activity'],
    ['Changes', 'changes']
  ]) {
    const code = `charging/Finance${name}Report`
    const entries = all.filter((item) => item.code === code)
    assert.equal(entries.length, 1, code)
    assert.equal(entries[0].url, `/charging/reports/Finance${name}Report`)
    assert.ok(
      entries[0].buttons.some(
        (button) =>
          button.id === 'export' &&
          button.permissions.some(
            (grant) => grant.permission === `property-finance-report-${resource}` && grant.actions.includes('export')
          )
      )
    )
  }
})
const require = createRequire(import.meta.url)
const built = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-report/useAnalysisReport.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /financeAnalysis|useProjectContext|@jetlinks-web|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeAnalysis')
            ? 'export const queryAnalysis=(...a)=>globalThis.__report.api.query(...a);export const exportAnalysis=(...a)=>globalThis.__report.api.export(...a)'
            : a.path.includes('useProjectContext')
            ? 'export const useProjectContext=()=>globalThis.__report.context;export const useProjectSwitchGuard=g=>globalThis.__report.guards.push(g)'
            : a.path === 'vue-i18n'
            ? 'export const useI18n=()=>({t:k=>k})'
            : 'export const onlyMessage=(...a)=>globalThis.__report.messages.push(a);export const downloadFileByUrl=(...a)=>globalThis.__report.downloads.push(a)'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, m, m.exports)
const { useAnalysisReport } = m.exports
const amounts = {
  incomeAmount: '110.01',
  refundAmount: '10.00',
  netAmount: '100.01',
  currentPeriodAmount: null,
  otherPeriodAmount: null
}
const result = () => ({
  groupBy: 'DETAIL',
  summary: { ...amounts },
  periodEnabled: false,
  page: { data: [], total: 25, pageIndex: 0, pageSize: 12 }
})
function setup(overrides = {}) {
  globalThis.__report = {
    kind: overrides.kind || 'activity',
    context: {
      projectId: ref('a'),
      reportProjectIds: ref(['a']),
      projects: ref([
        { id: 'a', name: '甲项目' },
        { id: 'b', name: '乙项目' }
      ])
    },
    guards: [],
    messages: [],
    downloads: [],
    api: {
      query: async () => ({
        groupBy: 'ACTIVITY',
        columns: [],
        summary: { principal: '600.00' },
        page: { data: [], total: 0, pageIndex: 0, pageSize: 12 }
      }),
      export: async () => new Blob(['ok']),
      ...overrides
    }
  }
  let state
  const renderer = createRenderer({
    patchProp() {},
    insert() {},
    remove() {},
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    setText() {},
    setElementText() {},
    parentNode: () => null,
    nextSibling: () => null
  })
  const app = renderer.createApp(
    defineComponent({
      setup() {
        state = useAnalysisReport(globalThis.__report.kind)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, close: () => app.unmount() }
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}

test('月份下钻保留已应用的起止范围，返回后恢复', () => {
  const { state, close } = setup()
  state.apply({ startDate: '2024-02-10', endDate: '2024-02-20' })
  state.group('MONTH')
  state.drill({ month: '2024-02' })
  assert.equal(state.active.value.startDate, '2024-02-10')
  assert.equal(state.active.value.endDate, '2024-02-20')
  assert.equal(state.active.value.groupBy, 'DETAIL')
  state.back()
  assert.equal(state.active.value.groupBy, 'MONTH')
  close()
})
test('同名活动按稳定ID下钻，切换项目清除下钻条件', () => {
  const { state, close } = setup()
  state.drill({ projectId: 'a', activityId: 'act-a', activityName: '同名活动' })
  assert.equal(state.active.value.activityId, 'act-a')
  assert.equal(state.active.value.activityName, undefined)
  globalThis.__report.context.reportProjectIds.value = ['b']
  assert.deepEqual(state.active.value.projectIds, ['b'])
  assert.equal(state.active.value.activityId, undefined)
  assert.equal(state.parent.value, undefined)
  close()
})
test('旧请求晚返回不覆盖新项目统计', async () => {
  const pending = deferred()
  let n = 0
  const { state, close } = setup({
    query: () =>
      ++n === 1
        ? pending.promise
        : Promise.resolve({
            groupBy: 'PROJECT',
            columns: [],
            summary: { principal: '200' },
            page: { data: [], total: 0, pageIndex: 0, pageSize: 12 }
          })
  })
  const first = state.request({ terms: [] })
  globalThis.__report.context.reportProjectIds.value = ['b']
  await state.request({ terms: [] })
  pending.resolve({ summary: { principal: '100' }, page: { data: [], total: 0 } })
  await first
  assert.equal(state.result.value.summary.principal, '200')
  close()
})
test('后端失败明确显示失败态并清除旧摘要', async () => {
  const { state, close } = setup({
    query: async () => {
      throw Error('历史不连续')
    }
  })
  await assert.rejects(state.request({ terms: [] }))
  assert.equal(state.failed.value, true)
  assert.equal(state.result.value, undefined)
  assert.equal(globalThis.__report.messages.length, 1)
  close()
})
