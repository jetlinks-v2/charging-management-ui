import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, ref, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = [
  'batchClosing',
  'getAccountingYear',
  'getClosingSchedule',
  'saveClosingSchedule',
  'previewClosing',
  'confirmClosing',
  'createAccountingYear',
  'editAccountingYear',
  'reviewReceivables'
]
async function load(file) {
  const built = await build({
    entryPoints: [fileURLToPath(new URL('../' + file, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: [
      {
        name: 'boundaries',
        setup(b) {
          b.onResolve(
            {
              filter: /api\/financeAccounting|api\/financeReceivable|project\/useProjectContext|@jetlinks-web|vue-i18n/
            },
            (a) => ({ path: a.path, namespace: 'mock' })
          )
          b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
            contents: a.path.includes('api/')
              ? apiNames.map((n) => `export const ${n}=(...a)=>globalThis.__month.api.${n}(...a)`).join('\n')
              : a.path.includes('store/user')
              ? 'export const useUserStore=()=>globalThis.__month.identity'
              : a.path.includes('request-context')
              ? 'export const getApplicationAccessContext=()=>globalThis.__month.identity'
              : a.path.includes('project-runtime')
              ? 'export const getApplicationRuntimeEntry=()=>globalThis.__month.identity'
              : a.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__month.context;export const useProjectSwitchGuard=g=>globalThis.__month.guards.push(g)'
              : a.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:key=>key})'
              : 'export const onlyMessage=(...a)=>globalThis.__month.messages.push(a)'
          }))
        }
      }
    ]
  })
  const m = { exports: {} }
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, m, m.exports)
  return m.exports
}
const automatic = await load('hooks/finance-month-closing/useAutomaticClosing.ts')
const batch = await load('hooks/finance-month-closing/useClosingBatch.ts')
const closing = await load('hooks/finance-month-closing/useClosingConfirmation.ts')
const workspace = await load('hooks/finance-month-closing/useMonthClosingWorkspace.ts')
const editor = await load('hooks/finance-month-closing/useAccountingEditor.ts')
const review = await load('hooks/finance-receivable/useReceivableReview.ts')
const recovery = await load('hooks/finance-month-closing/useClosingRecovery.ts')
const reviewRecovery = await load('hooks/finance-receivable/useReviewRecovery.ts')
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
const period = (month = '2024-01') => ({
  id: month,
  projectId: 'project',
  accountYear: 2024,
  accountMonth: month,
  version: 3,
  startDate: month + '-01',
  endDate: month + '-31',
  status: 'OPEN',
  mode: 'NATURAL',
  openingDay: 1
})
const preview = (extra = {}) => ({
  token: 'token',
  version: 3,
  month: '2024-01',
  action: 'CLOSE',
  amount: '100.01',
  cashAmount: '60.00',
  sourceCount: 2,
  receivableCount: 1,
  pendingReceivableCount: 0,
  unhandedCount: 0,
  pendingHandoverCount: 0,
  requireReceivableReview: true,
  ...extra
})
function setup(overrides = {}, storage) {
  const map = storage || new Map()
  globalThis.window = {
    location: { pathname: '/tenant' },
    sessionStorage: { getItem: (k) => map.get(k), setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) }
  }
  globalThis.__month = {
    identity: reactive({ userInfo: { id: 'user' }, domain: 'tenant', applicationId: 'app' }),
    context: { projectId: ref('project') },
    guards: [],
    messages: [],
    api: {
      getAccountingYear: async () => [period()],
      previewClosing: async () => preview(),
      confirmClosing: async () => ({ operationId: 'close', month: '2024-01', status: 'CLOSED' }),
      createAccountingYear: async () => [],
      editAccountingYear: async () => [],
      reviewReceivables: async () => [{ id: 'bill', version: 4 }],
      ...overrides
    }
  }
  return map
}
function mount(factory) {
  let state,
    saves = 0
  const r = createRenderer({
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
  const app = r.createApp(
    defineComponent({
      setup() {
        state = factory(() => saves++)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, saves: () => saves, close: () => app.unmount() }
}
const input = () => ({ month: '2024-01', action: 'CLOSE', reason: '已核对', version: 3 })
const pending = () => ({ request: { requestId: 'r', token: 'token', input: input() }, preview: preview() })

test('月结恢复按账号租户应用入口项目隔离，原月期和金额保留', () => {
  setup()
  const p = ref('project'),
    store = recovery.useClosingRecovery(p)
  store.write(pending())
  assert.deepEqual(store.read(), pending())
  for (const field of ['domain', 'applicationId']) {
    const old = __month.identity[field]
    __month.identity[field] = 'other'
    assert.equal(store.read(), undefined)
    __month.identity[field] = old
  }
  __month.identity.userInfo.id = 'other'
  assert.equal(store.read(), undefined)
  __month.identity.userInfo.id = 'user'
  window.location.pathname = '/other'
  assert.equal(store.read(), undefined)
  window.location.pathname = '/tenant'
  p.value = 'other'
  assert.equal(store.read(), undefined)
  p.value = 'project'
  assert.deepEqual(store.read(), pending())
})
test('月结恢复拒绝损坏版本、动作、月份、计数和非精确金额', () => {
  const map = setup(),
    store = recovery.useClosingRecovery('project')
  for (const change of [
    (v) => v.preview.version++,
    (v) => (v.preview.month = '2024-02'),
    (v) => (v.request.input.action = 'REOPEN'),
    (v) => (v.preview.sourceCount = -1),
    (v) => (v.preview.amount = 1),
    (v) => (v.request.input.reason = ''),
    (v) => (v.request.token = 'other')
  ]) {
    const value = pending()
    change(value)
    store.write(value)
    assert.throws(() => store.read())
  }
  map.set([...map.keys()][0], '{')
  assert.throws(() => store.read())
})
test('月结预览更改原因即失效，清单未审核不可确认', async () => {
  setup({ previewClosing: async () => preview({ pendingReceivableCount: 1 }) })
  const m = mount((saved) =>
    closing.useClosingConfirmation({ projectId: 'project', period: period(), action: 'CLOSE' }, saved)
  )
  m.state.reason.value = '已核对'
  await m.state.calculate()
  assert.ok(m.state.preview.value)
  assert.equal(m.state.ready.value, false)
  m.state.reason.value = '修改原因'
  await nextTick()
  assert.equal(m.state.preview.value, undefined)
  m.close()
})
test('预览版本已改变时要求刷新，不以新版本偷偷覆盖原确认', async () => {
  setup({ previewClosing: async () => preview({ version: 4 }) })
  const m = mount((saved) =>
    closing.useClosingConfirmation({ projectId: 'project', period: period(), action: 'CLOSE' }, saved)
  )
  m.state.reason.value = '核对'
  await m.state.calculate()
  assert.equal(m.state.preview.value, undefined)
  assert.equal(__month.messages.at(-1)[0], 'MonthClosing.previewChanged')
  m.close()
})
test('月结网络未知后刷新仍重发相同请求，锁定原原因月份和版本', async () => {
  let first = true
  const calls = [],
    map = setup({
      confirmClosing: async (project, value) => {
        calls.push([project, structuredClone(value)])
        if (first) {
          first = false
          throw { isAxiosError: true }
        }
        return { operationId: 'close' }
      }
    })
  const props = { projectId: 'project', period: period(), action: 'CLOSE' }
  let m = mount((saved) => closing.useClosingConfirmation(props, saved))
  m.state.reason.value = '已核对'
  await m.state.calculate()
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  assert.equal(m.state.canClose.value, false)
  assert.equal(m.state.locked.value, true)
  m.close()
  assert.ok(map.size)
  m = mount((saved) => closing.useClosingConfirmation({ ...props, period: { ...period(), version: 99 } }, saved))
  assert.equal(m.state.reason.value, '已核对')
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(m.saves(), 1)
  assert.equal(map.size, 0)
  m.close()
})
test('存储失败不发送月结确认；明确409保留原因但清除旧预览', async () => {
  let calls = 0
  setup({
    confirmClosing: async () => {
      calls++
      throw { response: { status: 409, data: { message: '请重新核对' } } }
    }
  })
  const m = mount((saved) =>
    closing.useClosingConfirmation({ projectId: 'project', period: period(), action: 'CLOSE' }, saved)
  )
  m.state.reason.value = '核对'
  await m.state.calculate()
  const write = window.sessionStorage.setItem
  window.sessionStorage.setItem = () => {
    throw Error('quota')
  }
  await m.state.submit()
  assert.equal(calls, 0)
  window.sessionStorage.setItem = write
  await m.state.submit()
  assert.equal(calls, 1)
  assert.equal(m.state.reason.value, '核对')
  assert.equal(m.state.preview.value, undefined)
  assert.equal(m.state.uncertain.value, false)
  m.close()
})
test('年度请求竞争忽略旧项目响应，待恢复操作阻止切换项目', async () => {
  let resolve
  const old = new Promise((r) => (resolve = r))
  setup({
    getAccountingYear: (project) =>
      project === 'project' ? old : Promise.resolve([{ ...period(), projectId: 'second', id: 'second' }])
  })
  const m = mount(() => workspace.useMonthClosingWorkspace())
  __month.context.projectId.value = 'second'
  await flush()
  resolve([period()])
  await flush()
  assert.equal(m.state.periods.value[0].id, 'second')
  m.close()
  setup()
  recovery.useClosingRecovery('project').write(pending())
  const r = mount(() => workspace.useMonthClosingWorkspace())
  assert.equal(r.state.pending.value, true)
  assert.equal(__month.guards.at(-1)(), false)
  r.state.recover()
  assert.equal(r.state.target.value.accountMonth, '2024-01')
  r.close()
})
test('年度编辑完整连续校验，快照版本提交且不改调用方数组', async () => {
  let sent
  setup({
    editAccountingYear: async (...args) => {
      sent = args
    }
  })
  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = `2024-${String(i + 1).padStart(2, '0')}`
    return { ...period(month), endDate: `${month}-${new Date(2024, i + 1, 0).getDate()}` }
  })
  const m = mount((saved) =>
    editor.useAccountingEditor({ projectId: 'project', year: 2024, mode: 'edit', periods: rows }, saved)
  )
  m.state.reason.value = '调整'
  assert.equal(m.state.valid.value, true)
  m.state.rows.value[0].endDate = '2024-01-30'
  assert.equal(m.state.valid.value, false)
  await m.state.save()
  assert.equal(sent, undefined)
  m.state.rows.value[1].startDate = '2024-01-31'
  assert.equal(m.state.valid.value, true)
  await m.state.save()
  assert.equal(sent[2].items.length, 12)
  assert.equal(sent[2].items[0].version, 3)
  assert.equal(rows[0].endDate, '2024-01-31')
  m.close()
})

test('切换年度清空批量选择和详情，批量确认期间禁止切换项目', async () => {
  setup()
  const m = mount(() => workspace.useMonthClosingWorkspace())
  await flush()
  m.state.batchSelected.value = [period()]
  m.state.detailOpen.value = true
  m.state.year.value = 2025
  await flush()
  assert.deepEqual(m.state.batchSelected.value, [])
  assert.equal(m.state.detailOpen.value, false)
  m.state.batchAction.value = 'CLOSE'
  assert.equal(m.state.blocked.value, true)
  assert.equal(__month.guards.at(-1)(), false)
  m.state.batchAction.value = undefined
  m.state.detailOpen.value = true
  m.state.start(period(), 'CLOSE')
  assert.equal(m.state.detailOpen.value, false)
  assert.equal(m.state.target.value.accountMonth, '2024-01')
  m.close()
})

test('批量月结预检和确认使用同一请求，完成后不能再次提交旧版本', async () => {
  const calls = []
  setup({
    batchClosing: async (...args) => {
      calls.push(structuredClone(args))
      return [{ month: '2024-01', status: args[3] ? 'READY' : 'COMPLETED' }]
    }
  })
  const m = mount((saved) =>
    batch.useClosingBatch({ projectId: 'project', periods: [period()], action: 'CLOSE' }, saved)
  )
  m.state.reason.value = '核对'
  await m.state.run()
  await m.state.run(true)
  assert.deepEqual(calls[0][2], calls[1][2])
  assert.equal(m.state.completed.value, true)
  await m.state.run(true)
  assert.equal(calls.length, 2)
  assert.equal(m.saves(), 1)
  m.close()
})
const bill = () => ({
  id: 'bill',
  projectId: 'project',
  version: 3,
  fullName: '园区/101',
  actualReceivableAmount: '100.01',
  allowedOperations: ['APPROVE', 'REJECT']
})
test('应收审核只接收整批可执行操作，超100笔不发起，窗口和未知状态锁项目', () => {
  setup()
  const m = mount((saved) => review.useReceivableReview({ projectId: 'project' }, saved))
  m.state.start([bill()], 'UNAPPROVE')
  assert.equal(m.state.open.value, false)
  m.state.start(Array.from({ length: 101 }, bill), 'APPROVE')
  assert.equal(m.state.open.value, false)
  m.state.start([bill()], 'APPROVE')
  assert.equal(m.state.open.value, true)
  assert.equal(__month.guards.at(-1)(), false)
  m.close()
})
test('应收审核未知结果的原项目批次版本与请求号保持，跨项目恢复拒绝', async () => {
  let first = true
  const calls = []
  const map = setup({
    reviewReceivables: async (p, req) => {
      calls.push(structuredClone(req))
      if (first) {
        first = false
        throw { isAxiosError: true }
      }
      return [{ id: 'bill' }]
    }
  })
  const props = { projectId: 'project', rows: [bill()], action: 'APPROVE' }
  let m = mount((saved) => review.useReviewConfirmation(props, saved))
  m.state.reason.value = '核对'
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  m.close()
  const store = reviewRecovery.useReviewRecovery('project'),
    value = store.read()
  assert.ok(value)
  assert.equal(reviewRecovery.useReviewRecovery('other').read(), undefined)
  value.preview.rows[0].projectId = 'other'
  store.write(value)
  assert.throws(() => store.read())
  value.preview.rows[0].projectId = 'project'
  store.write(value)
  m = mount((saved) => review.useReviewConfirmation(props, saved))
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(m.saves(), 1)
  assert.equal(map.size, 0)
  m.close()
})

test('automatic schedule loads disabled default and posts selected day with its independent CAS version', async () => {
  setup()
  const busy = []
  const calls = []
  globalThis.__month.api.getClosingSchedule = async () => ({ version: 7, enabled: false, mode: 'MONTH_END', day: null })
  globalThis.__month.api.saveClosingSchedule = async (...args) => {
    calls.push(args)
    return { ...args[1], version: 8 }
  }
  let state
  const app = mount(() => automatic.useAutomaticClosing('project', (value) => busy.push(value)))
  state = app.state
  await flush()
  assert.equal(state.enabled.value, false)
  state.enabled.value = true
  state.mode.value = 'DAY'
  state.day.value = 5
  state.reason.value = '  每月结账  '
  await state.save()
  assert.deepEqual(calls, [['project', { version: 7, enabled: true, mode: 'DAY', day: 5, reason: '每月结账' }]])
  assert.deepEqual(busy, [true, false])
  assert.equal(state.schedule.value.version, 8)
  assert.equal(state.reason.value, '')
  app.close()
})

test('automatic schedule rejects invalid day, preserves reason/version on server conflict, and prevents double submit', async () => {
  setup()
  globalThis.__month.api.getClosingSchedule = async () => ({ version: 7, enabled: true, mode: 'DAY', day: 5 })
  let reject,
    count = 0,
    state
  globalThis.__month.api.saveClosingSchedule = () => {
    count++
    return new Promise((_, no) => {
      reject = no
    })
  }
  const app = mount(() => automatic.useAutomaticClosing('project', () => {}))
  state = app.state
  await flush()
  state.day.value = 31
  state.reason.value = '保留原因'
  await state.save()
  assert.equal(count, 0)
  state.day.value = 5
  const pending = state.save()
  await state.save()
  assert.equal(count, 1)
  reject(new Error('并发冲突'))
  await pending
  assert.equal(state.schedule.value.version, 7)
  assert.equal(state.reason.value, '保留原因')
  assert.equal(state.saving.value, false)
  assert.equal(globalThis.__month.messages.at(-1)[1], 'error')
  app.close()
})

test('month-end schedule submits no leftover specified day and refresh reads current version', async () => {
  setup()
  let version = 4,
    state,
    posted
  globalThis.__month.api.getClosingSchedule = async () => ({ version, enabled: false, mode: 'MONTH_END', day: null })
  globalThis.__month.api.saveClosingSchedule = async (_, input) => {
    posted = input
    return { ...input, version: 10 }
  }
  const app = mount(() => automatic.useAutomaticClosing('project', () => {}))
  state = app.state
  await flush()
  version = 9
  await state.load()
  state.day.value = 27
  state.reason.value = '停用'
  await state.save()
  assert.equal(posted.version, 9)
  assert.equal(posted.day, null)
  assert.equal(posted.enabled, false)
  app.close()
})
