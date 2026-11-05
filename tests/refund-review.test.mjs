import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const built = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-cashier/useRefundReview.ts', import.meta.url))],
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
          { filter: /financeRefundApplication|useFinanceBatchRecovery|@jetlinks-web\/utils|vue-i18n/ },
          (a) => ({ path: a.path, namespace: 'mock' })
        )
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeRefundApplication')
            ? 'export const reviewRefundApplication=(...a)=>globalThis.__reviewApi(...a)'
            : a.path.includes('useFinanceBatchRecovery')
              ? 'export const useFinanceBatchRecovery=()=>globalThis.__reviewStore'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:k=>k})'
                : 'export const onlyMessage=(...a)=>globalThis.__reviewMessages.push(a)'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, m, m.exports)
const renderer = createRenderer({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert() {},
  remove() {},
  setText() {},
  setElementText() {},
  parentNode() {},
  nextSibling() {},
  patchProp() {}
})
const row = (id, version = 1) => ({
  number: 'TK' + id,
  status: 'PENDING',
  version,
  receiverName: '测试',
  line: { applicationId: id }
})
function mount(api = async () => {}, saved, writeFails = false) {
  let store = saved,
    state,
    reloads = 0
  globalThis.__reviewMessages = []
  globalThis.__reviewApi = api
  globalThis.__reviewStore = {
    read: () => store,
    write: (action, input) => {
      if (writeFails) throw Error('storage')
      store = structuredClone({ action, input })
    },
    clear: () => {
      store = undefined
    }
  }
  const app = renderer.createApp(
    defineComponent({
      setup() {
        state = m.exports.useRefundReview(ref('project'), () => reloads++)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, stored: () => store, reloads: () => reloads, unmount: () => app.unmount() }
}
test('批量按申请去重，同申请多明细只执行一次，明确部分拒绝', async () => {
  const calls = []
  const w = mount(async (_p, id) => {
    calls.push(id)
    if (id === 'b') throw { response: { status: 409, data: { message: '版本冲突' } } }
  })
  w.state.start([row('a'), row('a'), row('b')], 'approve')
  w.state.reason.value = '核对'
  await w.state.submit()
  assert.deepEqual(calls, ['a', 'b'])
  assert.deepEqual(
    w.state.results.value.map((r) => r.success),
    [true, false]
  )
  assert.equal(w.stored(), undefined)
  assert.ok(globalThis.__reviewMessages.some((x) => x[0] === '版本冲突'))
  w.unmount()
})
test('网络未知恢复原申请和原请求号，不重新构造付款请求', async () => {
  let original
  const first = mount(async (...args) => {
    original = args
    throw { response: { status: 503 } }
  })
  first.state.start(row('a'), 'approve')
  first.state.reason.value = '核对'
  await first.state.submit()
  assert.equal(first.state.uncertain.value, true)
  first.state.cancel()
  assert.ok(first.state.target.value)
  const saved = structuredClone(first.stored())
  first.unmount()
  let retried
  const second = mount(async (...args) => {
    retried = args
  }, saved)
  await nextTick()
  assert.equal(second.state.uncertain.value, true)
  await second.state.submit()
  assert.deepEqual(retried, original)
  assert.equal(second.state.target.value, undefined)
  second.unmount()
})
test('存储不可用不发退款请求，非待审核行不可选', async () => {
  let calls = 0
  const w = mount(async () => calls++, undefined, true)
  w.state.start({ ...row('done'), status: 'SUCCEEDED' }, 'approve')
  assert.equal(w.state.target.value, undefined)
  w.state.start(row('a'), 'approve')
  w.state.reason.value = '核对'
  await w.state.submit()
  assert.equal(calls, 0)
  w.unmount()
})
