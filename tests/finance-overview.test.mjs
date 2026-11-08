import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, createSSRApp, defineComponent, h, reactive, ref, nextTick } from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import * as echarts from 'echarts'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-overview/useOverview.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /financeOverview|useProjectContext|@jetlinks-web|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeOverview')
            ? 'export const queryOverview=(...a)=>globalThis.__overview.api(...a)'
            : a.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__overview.context'
              : a.path.includes('store/user')
                ? 'export const useUserStore=()=>globalThis.__overview.user'
                : a.path.includes('request-context')
                  ? 'export const getApplicationAccessContext=()=>({domain:"test"})'
                  : a.path.includes('project-runtime')
                    ? 'export const getApplicationRuntimeEntry=()=>({applicationId:"test"})'
                    : a.path === 'vue-i18n'
                      ? 'export const useI18n=()=>({t:k=>k})'
                      : 'export const onlyMessage=(...a)=>globalThis.__overview.messages.push(a)'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, m, m.exports)
const { useOverview } = m.exports
const chartBuild = await build({
  entryPoints: [fileURLToPath(new URL('../utils/overviewCharts.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs'
})
const charts = { exports: {} }
new Function('require', 'module', 'exports', chartBuild.outputFiles[0].text)(require, charts, charts.exports)
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
const flush = async () => {
  await nextTick()
  await new Promise((r) => setImmediate(r))
}
function setup(api = async () => ({ asOfDate: '2024-01-01' }), store = new Map()) {
  globalThis.window = { location: { pathname: '/app/' } }
  globalThis.sessionStorage = { getItem: (k) => store.get(k), setItem: (k, v) => store.set(k, v) }
  const context = {
    projects: ref([
      { id: 'a', name: '甲' },
      { id: 'b', name: '乙' }
    ]),
    projectId: ref('business'),
    reportProjectIds: ref(['report']),
    loading: ref(false),
    failed: ref(false),
    refresh: async () => {
      context.projects.value = [...context.projects.value]
    }
  }
  globalThis.__overview = { context, user: reactive({ userInfo: { id: 'user-a' } }), messages: [], api }
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
        state = useOverview()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, context, user: globalThis.__overview.user, close: () => app.unmount() }
}

test('概览首次进入必须选择项目，确认后多选独立，取消保留原范围', async () => {
  const calls = [],
    v = setup(async (input) => {
      calls.push(input)
      return { asOfDate: 'ok' }
    })
  assert.deepEqual(v.state.projects.ids.value, [])
  assert.equal(v.state.projects.open.value, true)
  assert.equal(v.state.projects.required.value, true)
  v.state.projects.close()
  v.state.projects.confirm([])
  v.state.projects.confirm(['forged'])
  await flush()
  assert.equal(v.state.projects.open.value, true, 'empty or invalid selection cannot dismiss the initial picker')
  assert.equal(calls.length, 0)
  v.state.projects.confirm(['a', 'b'])
  await flush()
  assert.equal(v.state.projects.open.value, false)
  assert.equal(v.state.projects.required.value, false)
  assert.deepEqual(calls[0].projectIds, ['a', 'b'])
  await v.state.projects.choose()
  v.state.projects.close()
  await flush()
  assert.equal(v.state.projects.open.value, false)
  assert.deepEqual(v.state.projects.ids.value, ['a', 'b'])
  assert.equal(calls.length, 1, 'cancel must not reload')
  assert.equal(v.context.projectId.value, 'business')
  assert.deepEqual(v.context.reportProjectIds.value, ['report'])
  v.state.projects.confirm(['forged'])
  assert.deepEqual(v.state.projects.ids.value, ['a', 'b'])
  v.user.userInfo.id = 'user-b'
  await flush()
  assert.deepEqual(v.state.projects.ids.value, [])
  assert.equal(v.state.projects.open.value, true)
  assert.equal(v.state.projects.required.value, true)
  assert.equal(v.state.data.value, undefined)
  v.close()
})

test('重新进入概览仍须确认，不自动应用上次项目偏好', async () => {
  const store = new Map([['property:charging:overview:["user-a","test","test","app"]', '["a"]']])
  const v = setup(undefined, store)
  await flush()
  assert.deepEqual(v.state.projects.ids.value, [])
  assert.equal(v.state.projects.open.value, true)
  assert.equal(v.state.projects.required.value, true)
  assert.equal(v.state.data.value, undefined)
  v.close()
})

test('项目切换丢弃旧响应，撤权和卸载清理旧金额，失败保留重试', async () => {
  const first = deferred(),
    second = deferred()
  let calls = 0
  const v = setup(() => (++calls === 1 ? first.promise : second.promise))
  v.state.projects.confirm(['a'])
  await flush()
  v.state.projects.confirm(['b'])
  await flush()
  second.resolve({ asOfDate: 'b' })
  await flush()
  first.resolve({ asOfDate: 'a' })
  await flush()
  assert.equal(v.state.data.value.asOfDate, 'b')
  globalThis.__overview.api = async () => {
    throw new Error('offline')
  }
  await v.state.load()
  assert.equal(v.state.data.value, undefined)
  assert.equal(v.state.failed.value, true)
  globalThis.__overview.api = async () => ({ asOfDate: 'retry' })
  await v.state.load()
  assert.equal(v.state.data.value.asOfDate, 'retry')
  v.context.projects.value = []
  await flush()
  assert.equal(v.state.data.value, undefined)
  assert.equal(v.state.projects.open.value, true)
  assert.equal(v.state.projects.required.value, true)
  v.state.projects.close()
  assert.equal(v.state.projects.open.value, true)
  v.close()
})

test('大额十进制展示和负数舍入保留精度，图表缺日补零且退款净额可为负', () => {
  const { overviewMoney, trendOption } = charts.exports
  assert.equal(overviewMoney('9007199254740993.01', false), '9,007,199,254,740,993.01')
  assert.equal(overviewMoney('10050.00'), '1.01')
  assert.equal(overviewMoney('-10050.00'), '-1.01')
  assert.equal(overviewMoney('bad'), '—')
  const option = trendOption(
    {
      cash: {
        grain: 'DAY',
        trend: [{ period: '2024-02-02', incomeAmount: '0.00', refundAmount: '20.00', netAmount: '-20.00' }]
      }
    },
    '2024-02-01',
    '2024-02-03',
    (k) => k
  )
  assert.deepEqual(option.xAxis.data, ['2024-02-01', '2024-02-02', '2024-02-03'])
  assert.deepEqual(
    option.series[2].data.map((d) => d.rawAmount),
    ['0.00', '-20.00', '0.00']
  )
  assert.equal(option.series[2].data[1].value, -0.002)
  assert.ok(option.aria.label.description.includes('2024-02-02，Overview.income 0.00 Overview.wan，Overview.refund 0.00 Overview.wan，Overview.netCash 0.00 Overview.wan'))
  assert.ok(!option.aria.label.description.includes('NaN'))
})

test('房态编号未返回时仍显示实际名称，只有空名称显示未设置', async () => {
  const filename = fileURLToPath(new URL('../views/charging/FinanceOverview/OverviewAssets.vue', import.meta.url))
  const { descriptor } = parse(await readFile(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: 'overview-assets-test', inlineTemplate: true })
  const compiledAssets = await build({
    stdin: {
      contents: script.content,
      loader: 'ts',
      resolveDir: fileURLToPath(new URL('../views/charging/FinanceOverview/', import.meta.url))
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: [{
      name: 'i18n',
      setup(b) {
        b.onResolve({ filter: /^vue-i18n$/ }, () => ({ path: 'i18n', namespace: 'mock' }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: 'export const useI18n=()=>({t:k=>k==="Overview.unset"?"未设置":k})'
        }))
      }
    }]
  })
  const component = { exports: {} }
  new Function('require', 'module', 'exports', compiledAssets.outputFiles[0].text)(require, component, component.exports)
  const app = createSSRApp(component.exports.default, { houses: {
    houseCount: 3, incompleteCount: 0, buildingArea: '0.00', billingArea: '210.00',
    states: [{ text: '自住', count: 2 }, { text: '出租', count: 1 }, { text: '', count: 0 }]
  } })
  app.component('j-ellipsis', { setup: (_, { slots }) => () => h('span', slots.default?.()) })
  const html = await renderToString(app)
  assert.ok(html.includes('自住'))
  assert.ok(html.includes('出租'))
  assert.equal(html.split('未设置').length - 1, 1)
})

test('四类图表以真实ECharts渲染SVG，长科目可滚动且窄宽度不产生无效几何', () => {
  const result = {
    receivables: {
      subjects: Array.from({ length: 12 }, (_, n) => ({
        subjectName: '较长的收费科目名称' + n,
        amounts: {
          netAmount: '30000.01',
          receivedAmount: '10000.00',
          unreceivedAmount: '20000.01',
          overdueAmount: '20000.01'
        }
      })),
      ageBuckets: [{ key: 'D1_30', amount: '20000.01' }]
    },
    cash: {
      grain: 'DAY',
      trend: [{ period: '2024-02-02', incomeAmount: '10000.01', refundAmount: '20000.00', netAmount: '-9999.99' }]
    },
    balances: { items: [{ type: 'ADVANCE', subjectName: '预存物业费', amount: '30000.01' }] }
  }
  const t = (key) => key.split('.').pop()
  const options = [
    charts.exports.collectionOption(result, t),
    charts.exports.arrearsOption(result, 'age', t),
    charts.exports.balanceOption(result, 'ADVANCE', t),
    charts.exports.trendOption(result, '2024-02-01', '2024-02-03', t)
  ]
  assert.equal(options[0].dataZoom[0].endValue, 7)
  assert.ok(options[0].aria.label.description.includes('较长的收费科目名称0，paid 1.00 wan，unpaid 2.00 wan'))
  for (const width of [430, 700])
    for (const option of options) {
      const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width, height: 280 })
      try {
        chart.setOption(option)
        const svg = chart.renderToSVGString()
        assert.ok(svg.includes('<svg'))
        assert.ok(svg.includes('<path'))
        assert.ok(!svg.includes('NaN'), svg)
      } finally {
        chart.dispose()
      }
    }
})
