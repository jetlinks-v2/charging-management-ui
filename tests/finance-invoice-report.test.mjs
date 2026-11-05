import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref } from 'vue'
const require = createRequire(import.meta.url)
const built = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-report/useInvoiceReport.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /financeInvoiceReport|useProjectContext|@jetlinks-web|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeInvoiceReport')
            ? 'export const queryInvoiceReport=(...a)=>globalThis.__report.api.query(...a);export const exportInvoiceReport=(...a)=>globalThis.__report.api.export(...a)'
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
const { useInvoiceReport } = m.exports
const amounts = {
  receivableAmount: '9999999999999999.99',
  receivedAmount: '100.01',
  invoicedAmount: '50.01',
  uninvoicedAmount: '9999999999999949.98'
}
const result = () => ({
  groupBy: 'DETAIL',
  summary: { ...amounts },
  page: { data: [], total: 25, pageIndex: 0, pageSize: 12 }
})
function setup(overrides = {}) {
  globalThis.__report = {
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
    api: { query: async () => result(), export: async () => new Blob(['ok']), ...overrides }
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
        state = useInvoiceReport()
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

test('分页、全量摘要使用服务器精确文本；输入草稿不改变已应用条件', async () => {
  const calls = [],
    v = setup({
      query: async (i) => {
        calls.push(i)
        return result()
      }
    }),
    s = v.state
  s.draft.customerName = '草稿'
  await s.request({ pageIndex: 1, pageSize: 12 })
  assert.equal(calls[0].customerName, undefined)
  assert.equal(calls[0].pageIndex, 1)
  assert.deepEqual(s.summary.value, amounts)
  s.apply()
  await s.request({ pageIndex: 0, pageSize: 12 })
  assert.equal(calls[1].customerName, '草稿')
  s.draft.projectIds.push('b')
  assert.deepEqual(s.active.value.projectIds, ['a'])
  v.close()
})
test('项目与科目多选下钻保留既有条件、清空旧摘要与选中状态', async () => {
  const v = setup(),
    s = v.state
  s.draft.customerName = '张'
  s.apply()
  __report.context.reportProjectIds.value = ['a', 'b']
  s.draft.customerName = '张'
  s.apply()
  s.group('PROJECT')
  s.drill([{ projectId: 'a' }, { projectId: 'b' }])
  assert.deepEqual(s.active.value.projectIds, ['a', 'b'])
  assert.equal(s.active.value.customerName, '张')
  assert.equal(s.active.value.groupBy, 'DETAIL')
  s.group('SUBJECT')
  s.drill([
    { subjectId: 'x', subjectName: '物业费' },
    { subjectId: 'y', subjectName: '水费' }
  ])
  assert.deepEqual(s.active.value.subjectIds, ['x', 'y'])
  assert.equal(s.subjectLabel.value, '物业费、水费')
  assert.equal(s.summary.value, undefined)
  s.clearSubjects()
  assert.deepEqual(s.active.value.subjectIds, [])
  assert.equal(s.active.value.customerName, '张')
  v.close()
})
test('旧请求不能覆盖新汇总，过期错误不弹消息', async () => {
  const a = deferred(),
    b = deferred(),
    v = setup({ query: (i) => (i.pageIndex === 0 ? a.promise : b.promise) }),
    s = v.state
  const first = s.request({ pageIndex: 0 }),
    second = s.request({ pageIndex: 1 })
  b.resolve(result())
  await second
  a.reject(new Error('过期错误'))
  await assert.rejects(first)
  assert.deepEqual(s.summary.value, amounts)
  assert.equal(__report.messages.length, 0)
  v.close()
})
test('当前失败清空过期金额、显示一次消息并阻止导出', async () => {
  let exports = 0
  const v = setup({
      query: async () => {
        throw new Error('筛选项目无权限')
      },
      export: async () => {
        exports++
        return new Blob()
      }
    }),
    s = v.state
  s.summary.value = amounts
  await assert.rejects(s.request({}))
  assert.equal(s.summary.value, undefined)
  assert.equal(s.failed.value, true)
  assert.equal(__report.messages.length, 1)
  await s.exportRows('excel')
  assert.equal(exports, 0)
  v.close()
})
test('导出只读取已应用筛选并冻结范围；重置与项目切换守卫生效', async () => {
  const pending = deferred(),
    calls = [],
    v = setup({
      export: async (i, f) => {
        calls.push({ i, f })
        return pending.promise
      }
    }),
    s = v.state
  s.draft.customerName = '未查询草稿'
  const task = s.exportRows('pdf', true)
  assert.equal(s.exporting.value, true)
  assert.equal(__report.guards[0](), false)
  assert.equal(calls[0].i.customerName, undefined)
  s.group('SUBJECT')
  assert.equal(s.active.value.groupBy, 'DETAIL')
  s.reset()
  assert.equal(s.draft.customerName, '未查询草稿')
  pending.resolve(new Blob(['pdf'], { type: 'application/pdf' }))
  await task
  assert.equal(s.previewOpen.value, true)
  assert.match(s.previewUrl.value, /^blob:/)
  assert.equal(__report.guards[0](), false)
  s.closePreview()
  assert.equal(s.previewUrl.value, '')
  assert.equal(__report.guards[0](), true)
  v.close()
})
test('账号或全局项目重置使旧导出失效，不弹旧错误或保留旧数据', async () => {
  const pending = deferred(),
    v = setup({ export: () => pending.promise }),
    s = v.state
  const task = s.exportRows('pdf', true)
  __report.context.reportProjectIds.value = ['b']
  assert.deepEqual(s.active.value.projectIds, ['b'])
  assert.equal(s.exporting.value, false)
  pending.resolve(new Blob(['old']))
  await task
  assert.equal(s.previewUrl.value, '')
  assert.equal(s.previewOpen.value, false)
  v.close()
})
test('导出JSON业务失败只通过消息提示，查询草稿保留', async () => {
  const v = setup({
      export: async () => {
        throw {
          response: { data: new Blob([JSON.stringify({ message: '超过10000行' })], { type: 'application/json' }) }
        }
      }
    }),
    s = v.state
  s.draft.customerName = '保留'
  await s.exportRows('excel')
  assert.deepEqual(__report.messages, [['超过10000行', 'error']])
  assert.equal(s.draft.customerName, '保留')
  assert.equal(s.exporting.value, false)
  v.close()
})
test('刷新不应用草稿，无项目申请被明确阻止；销毁后的请求不能回写', async () => {
  const pending = deferred(),
    v = setup({ query: () => pending.promise }),
    s = v.state
  s.draft.customerName = '草稿'
  s.reload()
  assert.equal(s.active.value.customerName, undefined)
  __report.context.reportProjectIds.value = []
  s.apply()
  assert.equal(__report.messages.length, 1)
  assert.deepEqual(s.active.value.projectIds, [])
  __report.context.reportProjectIds.value = ['a']
  const task = s.request({})
  v.close()
  pending.resolve(result())
  await task
  assert.equal(s.summary.value, undefined)
})

test('最新模拟票据条件完整提交，刷新和重置不会保留旧条件', async () => {
  const calls = [],
    v = setup({
      query: async (i) => {
        calls.push(i)
        return result()
      }
    }),
    s = v.state
  Object.assign(s.draft, {
    invoiceNo: 'SIM-100',
    invoiceType: '2',
    invoiceStatus: 'PARTIAL',
    invoiceDateStart: '2024-02-01',
    invoiceDateEnd: '2024-02-29',
    sourceType: 'TEMP_PAYMENT',
    sourceId: 'SK100'
  })
  s.apply()
  await s.request({})
  assert.equal(calls[0].invoiceNo, 'SIM-100')
  assert.equal(calls[0].sourceType, 'TEMP_PAYMENT')
  assert.equal(calls[0].invoiceDateStart, '2024-02-01')
  s.reset()
  await s.request({})
  for (const key of [
    'invoiceNo',
    'invoiceType',
    'invoiceStatus',
    'invoiceDateStart',
    'invoiceDateEnd',
    'sourceType',
    'sourceId'
  ])
    assert.equal(calls[1][key], undefined)
  v.close()
})

test('全局多项目是唯一范围来源，恶意项目下钻不能扩大查询或导出', async () => {
  const calls = [],
    v = setup({
      query: async (i) => {
        calls.push(i)
        return result()
      }
    }),
    s = v.state
  __report.context.reportProjectIds.value = ['a', 'b']
  assert.deepEqual(s.active.value.projectIds, ['a', 'b'])
  s.draft.projectIds = ['secret']
  s.apply()
  assert.deepEqual(s.active.value.projectIds, ['a', 'b'])
  s.group('PROJECT')
  s.drill([{ projectId: 'secret' }])
  assert.equal(s.active.value.groupBy, 'PROJECT')
  s.drill([{ projectId: 'a' }, { projectId: 'secret' }])
  await s.request({})
  assert.deepEqual(calls[0].projectIds, ['a'])
  __report.context.reportProjectIds.value.push('c')
  assert.deepEqual(s.active.value.projectIds, ['a', 'b', 'c'])
  v.close()
})

test('分组下钻保存编码和名称快照，清除标签同时清除精确快照条件', () => {
  const v = setup(),
    s = v.state
  s.group('SUBJECT')
  s.drill([{ subjectId: 'same', subjectName: '历史名称' }])
  assert.deepEqual(s.active.value.subjectGroups, [{ value: 'same', label: '历史名称' }])
  s.clearSubjects()
  assert.deepEqual(s.active.value.subjectGroups, [])
  v.close()
})
