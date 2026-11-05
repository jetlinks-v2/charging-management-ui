import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const names = [
  'getAdvanceSources',
  'getAdvanceOptions',
  'getAdvanceHouse',
  'previewPaymentToAdvance',
  'confirmPaymentToAdvance'
]
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-cashier/usePaymentToAdvance.ts', import.meta.url))],
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
          { filter: /api\/financePaymentToAdvance|usePaymentRecovery|@jetlinks-web\/utils|vue-i18n/ },
          (a) => ({ path: a.path, namespace: 'mock' })
        )
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financePaymentToAdvance')
            ? names.map((n) => `export const ${n}=(...a)=>globalThis.__advanceApi.${n}(...a)`).join('\n')
            : a.path.includes('usePaymentRecovery')
              ? 'export const usePaymentRecovery=()=>globalThis.__advanceRecovery'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__advanceMessages.push(a)'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, m, m.exports)
const { usePaymentToAdvance } = m.exports
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
function mount(factory, api = {}) {
  globalThis.__advanceMessages = []
  globalThis.__advanceApi = {
    previewPaymentToAdvance: async (_p, i) => ({ token: 'fresh', amount: i.amount }),
    confirmPaymentToAdvance: async () => ({ entry: { id: 'entry', cashAmount: '0.00' } }),
    getAdvanceSources: async () => [
      { companyId: 'source', line: { id: 'line', version: 7, amount: '60.01', refundedAmount: '10.00' } }
    ],
    getAdvanceOptions: async () => ({
      companies: [{ id: 'source' }, { id: 'target' }],
      projectSubjects: [],
      standards: [{ id: 'std', companyId: 'target' }]
    }),
    getAdvanceHouse: async (_p, id) => ({
      house: { spaceId: id, fullName: '园区/101' },
      customers: [{ relationshipId: 'link', name: '龚超' }]
    }),
    ...api
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
        state = factory()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
function storage() {
  let pending
  return {
    read: () => pending,
    write: (value) => {
      pending = JSON.parse(JSON.stringify(value))
    },
    clear: () => {
      pending = undefined
    }
  }
}

async function editor(api = {}) {
  globalThis.__advanceRecovery = storage()
  const view = mount(() => usePaymentToAdvance('project', [{ line: { id: 'line' } }], () => {}), api)
  await flush()
  return view
}
function fill(state) {
  Object.assign(state.model, {
    targetCompanyId: 'target',
    standardId: 'std',
    spaceId: 'room',
    relationshipId: 'link',
    reason: '转存'
  })
}
test('重查来源版本、剩余精确金额；目标可另选公司房屋和标准', async () => {
  let received
  const { state, unmount } = await editor({
    previewPaymentToAdvance: async (_p, i) => {
      received = i
      return { token: 'fresh', amount: i.amount }
    }
  })
  assert.equal(state.model.amount, '50.01')
  assert.equal(state.model.items[0].version, 7)
  await state.pick('other')
  assert.equal(state.model.relationshipId, '')
  assert.equal(state.model.spaceId, 'other')
  fill(state)
  await state.calculate()
  assert.equal(received.companyId, 'source')
  assert.equal(received.targetCompanyId, 'target')
  assert.equal(received.amount, '50.01')
  await state.confirmation.submit()
  assert.equal(state.confirmation.result.value.entry.cashAmount, '0.00')
  assert.equal(globalThis.__advanceRecovery.read(), undefined)
  unmount()
})
test('不同原公司不可混选，加载失败不允许预览', async () => {
  let previews = 0
  const { state, unmount } = await editor({
    getAdvanceSources: async () => [{ companyId: 'a' }, { companyId: 'b' }],
    previewPaymentToAdvance: async () => {
      previews++
    }
  })
  assert.equal(state.ready.value, false)
  await state.calculate()
  assert.equal(previews, 0)
  assert.ok(globalThis.__advanceMessages.length)
  unmount()
})
test('目标公司切换清空不匹配标准，改变目标使迟到预览失效', async () => {
  let finish
  const { state, unmount } = await editor({ previewPaymentToAdvance: () => new Promise((r) => (finish = r)) })
  fill(state)
  await flush()
  state.model.targetCompanyId = 'source'
  await flush()
  assert.equal(state.model.standardId, '')
  fill(state)
  const pending = state.calculate()
  await flush()
  state.model.amount = '2.00'
  finish({ token: 'old' })
  await pending
  assert.equal(state.confirmation.preview.value, undefined)
  unmount()
})
test('附件未完成不预览；业务409保留输入且允许重新核对', async () => {
  let previews = 0
  const { state, unmount } = await editor({
    previewPaymentToAdvance: async () => {
      previews++
      return { token: 'fresh' }
    },
    confirmPaymentToAdvance: async () => {
      throw { response: { status: 409 }, message: '来源已变化' }
    }
  })
  fill(state)
  state.filesChanged({ fileList: [{ uid: 'file', name: '证明.pdf', status: 'uploading' }] })
  await state.calculate()
  assert.equal(previews, 0)
  state.filesChanged({ fileList: [] })
  await state.calculate()
  await state.confirmation.submit()
  assert.equal(state.model.reason, '转存')
  assert.equal(state.confirmation.preview.value, undefined)
  assert.equal(state.confirmation.uncertain.value, false)
  unmount()
})
test('网络未知重挂载只使用原请求号与原目标；恢复期间不重查来源', async () => {
  const calls = []
  let sourceLoads = 0
  const api = {
    getAdvanceSources: async () => {
      sourceLoads++
      return [{ companyId: 'source', line: { id: 'line', version: 7, amount: '10.01', refundedAmount: '0.00' } }]
    },
    confirmPaymentToAdvance: async (_p, r) => {
      calls.push(structuredClone(r))
      if (calls.length === 1) throw Error('network')
      return { entry: { id: 'done' } }
    }
  }
  let current = await editor(api)
  fill(current.state)
  await current.state.calculate()
  await current.state.confirmation.submit()
  assert.equal(current.state.confirmation.uncertain.value, true)
  current.unmount()
  current = mount(() => usePaymentToAdvance('project', [], () => {}), api)
  await flush()
  assert.equal(sourceLoads, 1)
  assert.equal(current.state.model.spaceId, 'room')
  await current.state.calculate()
  await current.state.confirmation.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(current.state.confirmation.result.value.entry.id, 'done')
  current.unmount()
})
test('快速改选房屋只接收最后响应，旧请求不能覆盖目标', async () => {
  let first
  const { state, unmount } = await editor({
    getAdvanceHouse: async (_p, id) =>
      id === 'first' ? new Promise((r) => (first = r)) : { house: { spaceId: id }, customers: [] }
  })
  const pending = state.pick('first')
  await state.pick('second')
  first({ house: { spaceId: 'first' }, customers: [] })
  await pending
  assert.equal(state.model.spaceId, 'second')
  assert.equal(state.house.value.house.spaceId, 'second')
  unmount()
})
