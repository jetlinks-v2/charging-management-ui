import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = ['previewFunds', 'confirmFunds', 'queryFundBills', 'getFundsOptions', 'getFundsHouse', 'getFundQuote']
const compiled = await build({
  entryPoints: [
    fileURLToPath(new URL('../hooks/finance-funds/useFundConfirmation.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundBills.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundEditor.ts', import.meta.url))
  ],
  outdir: 'out',
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(builder) {
        builder.onResolve({ filter: /api\/financeFunds|@jetlinks-web\/utils|vue-i18n|useFundRecovery/ }, (args) => ({
          path: args.path,
          namespace: 'mock'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeFunds')
            ? apiNames.map((name) => `export const ${name}=(...a)=>globalThis.__fundApi.${name}(...a)`).join('\n')
            : args.path.includes('useFundRecovery')
              ? 'export const useFundRecovery=()=>globalThis.__fundRecovery'
              : args.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__fundMessages.push(a)'
        }))
      }
    }
  ]
})
const modules = compiled.outputFiles.map((file) => {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', file.text)(require, m, m.exports)
  return m.exports
})
const { useFundConfirmation } = modules[0],
  { useFundBills } = modules[1],
  { useFundEditor } = modules[2]
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
function mount(factory, api = {}) {
  globalThis.__fundMessages = []
  globalThis.__fundApi = {
    previewFunds: async () => ({ token: 'fresh', amount: '10.01' }),
    confirmFunds: async () => ({ entry: { id: 'entry' } }),
    queryFundBills: async () => ({
      data: [{ id: 'bill', version: 4, arrears: '10.01', customerId: 'customer' }],
      total: 12
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
const input = {
  action: 'REFUND',
  type: 'ADVANCE',
  accountId: 'account',
  version: 4,
  companyId: 'company',
  amount: '10.01',
  occurredAt: '2026-11-04T10:00:00',
  payerName: '张女士',
  reason: '退回预收款'
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
test('资金预览保留精确字符串与来源版本；拒绝不入账，重试用新预览', async () => {
  let saved = 0,
    calls = []
  const store = storage(),
    { state, unmount } = mount(() => useFundConfirmation('project', store, () => saved++), {
      confirmFunds: async (_p, request) => {
        calls.push(request)
        if (calls.length === 1) throw { response: { status: 409 } }
        return { entry: { id: 'confirmed' } }
      }
    })
  await state.calculate({ ...input })
  await state.submit()
  assert.equal(state.preview.value, undefined)
  assert.equal(saved, 0)
  assert.equal(store.read(), undefined)
  assert.equal(calls[0].input.amount, '10.01')
  assert.equal(calls[0].input.version, 4)
  await state.calculate({ ...input })
  await state.submit()
  assert.equal(saved, 1)
  assert.equal(state.result.value.entry.id, 'confirmed')
  unmount()
})
test('网络未知结果重挂载恢复原请求号，403后仍不得丢弃或重新预览', async () => {
  const store = storage(),
    calls = []
  let current = mount(() => useFundConfirmation('project', store, () => {}), {
    confirmFunds: async (_p, request) => {
      calls.push(structuredClone(request))
      throw Error('network')
    }
  })
  await current.state.calculate({ ...input })
  await current.state.submit()
  assert.equal(current.state.uncertain.value, true)
  current.unmount()
  current = mount(() => useFundConfirmation('project', store, () => {}), {
    confirmFunds: async (_p, request) => {
      calls.push(structuredClone(request))
      if (calls.length === 2) throw { response: { status: 403 } }
      return { entry: { id: 'original' } }
    }
  })
  assert.deepEqual(current.state.restore(), input)
  await current.state.submit()
  assert.equal(current.state.uncertain.value, true)
  current.state.invalidate()
  assert.ok(current.state.preview.value)
  await current.state.submit()
  assert.equal(current.state.result.value.entry.id, 'original')
  assert.equal(calls[0].requestId, calls[2].requestId)
  assert.equal(store.read(), undefined)
  current.unmount()
})
test('存储失败禁止发送，迟到预览不能覆盖已改输入', async () => {
  let complete,
    calls = 0
  const { state, unmount } = mount(
    () =>
      useFundConfirmation(
        'project',
        {
          read: () => undefined,
          write: () => {
            throw Error('storage')
          },
          clear() {}
        },
        () => {}
      ),
    {
      previewFunds: () =>
        new Promise((resolve) => {
          complete = resolve
        }),
      confirmFunds: async () => {
        calls++
      }
    }
  )
  const old = state.calculate({ ...input })
  state.invalidate()
  complete({ token: 'stale' })
  await old
  assert.equal(state.preview.value, undefined)
  const fresh = state.calculate({ ...input })
  complete({ token: 'new' })
  await fresh
  await state.submit()
  assert.equal(calls, 0)
  assert.equal(state.saving.value, false)
  unmount()
})
test('冲抵分页或加载失败即时清空父级已选账单，金额用十进制合计', async () => {
  const changes = []
  let failing = false
  const { state, unmount } = mount(
    () =>
      useFundBills({ projectId: 'project', account: { id: 'account', customerId: 'customer' } }, (...args) =>
        changes.push(args)
      ),
    {
      queryFundBills: async () => {
        if (failing) throw Error('failed')
        return { data: [{ id: 'bill', version: 4, arrears: '10.01', customerId: 'customer' }], total: 12 }
      }
    }
  )
  await flush()
  state.selection.value.onChange(['bill'])
  assert.deepEqual(changes.at(-1), [[{ id: 'bill', version: 4, amount: '10.01' }], '10.01'])
  failing = true
  await state.load(2)
  assert.deepEqual(changes.at(-1), [[], '0.00'])
  assert.equal(state.rows.value.length, 0)
  unmount()
})

test('收取更换公司清空不匹配标准，清除数量后迟到报价不能覆盖手工金额', async () => {
  let finish
  globalThis.__fundRecovery = storage()
  const { state, unmount } = mount(
    () => useFundEditor({ projectId: 'project', draft: { type: 'ADVANCE', action: 'TOPUP' } }, () => {}),
    {
      getFundsOptions: async () => ({
        companies: [
          { id: 'company', funding: [{ id: 'cash', method: '1' }] },
          { id: 'other', funding: [] }
        ],
        standards: [{ id: 'standard', companyId: 'company' }],
        projectSubjects: []
      }),
      getFundQuote: () =>
        new Promise((resolve) => {
          finish = resolve
        })
    }
  )
  await flush()
  state.model.companyId = 'company'
  await flush()
  state.model.standardId = 'standard'
  state.model.quantity = '2'
  const old = state.quote()
  state.model.quantity = undefined
  await state.quote()
  state.model.amount = '12.01'
  finish('999.99')
  await old
  assert.equal(state.model.amount, '12.01')
  state.model.companyId = 'other'
  await flush()
  assert.equal(state.model.standardId, undefined)
  unmount()
})

test('恢复跨公司收取原请求时不由空选项清除标准、付款方式或数量', async () => {
  const store = storage()
  store.write({
    request: {
      requestId: 'original',
      token: 'saved',
      input: { ...input, action: 'TOPUP', standardId: 'standard', method: '2', recordedId: 'bank', quantity: '2' }
    },
    preview: { token: 'saved', amount: '10.01' }
  })
  globalThis.__fundRecovery = store
  const { state, unmount } = mount(() =>
    useFundEditor({ projectId: 'project', draft: { type: 'ADVANCE', action: 'TOPUP' } }, () => {})
  )
  await flush()
  assert.equal(state.confirmation.uncertain.value, true)
  assert.equal(state.model.standardId, 'standard')
  assert.equal(state.model.method, '2')
  assert.equal(state.model.quantity, '2')
  unmount()
})
