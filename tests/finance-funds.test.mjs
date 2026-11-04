import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = [
  'previewFunds',
  'confirmFunds',
  'queryFundBills',
  'getFundsOptions',
  'getFundsHouse',
  'getFundQuote',
  'previewFundReturn',
  'confirmFundReturn',
  'previewFundRevoke',
  'confirmFundRevoke'
]
const compiled = await build({
  entryPoints: [
    fileURLToPath(new URL('../hooks/finance-funds/useFundConfirmation.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundBills.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundEditor.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundReturn.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-funds/useFundRevoke.ts', import.meta.url))
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
        builder.onResolve(
          {
            filter:
              /api\/financeFunds|api\/financeFundReturn|api\/financeFundRevoke|usePaymentRecovery|@jetlinks-web\/utils|vue-i18n|useFundRecovery/
          },
          (args) => ({
            path: args.path,
            namespace: 'mock'
          })
        )
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents:
            args.path.includes('financeFunds') ||
            args.path.includes('financeFundReturn') ||
            args.path.includes('financeFundRevoke')
              ? apiNames.map((name) => `export const ${name}=(...a)=>globalThis.__fundApi.${name}(...a)`).join('\n')
              : args.path.includes('usePaymentRecovery')
                ? 'export const usePaymentRecovery=()=>globalThis.__fundRecovery'
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
  { useFundEditor } = modules[2],
  { useFundReturn } = modules[3],
  { useFundRevoke } = modules[4]
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

test('冲抵退回发送原流水、账户版本和精确金额；成功只刷新一次', async () => {
  let saved = 0,
    received
  globalThis.__fundRecovery = storage()
  const { state, unmount } = mount(
    () =>
      useFundReturn(
        'project',
        {
          account: { version: 7 },
          entry: { id: 'offset', amount: '-30.01' }
        },
        () => saved++
      ),
    {
      previewFundReturn: async (_p, value) => {
        received = value
        return { token: 'return-token', amount: value.amount }
      },
      confirmFundReturn: async () => ({ account: { balance: '60.00' }, entry: { id: 'returned', cashAmount: '0.00' } })
    }
  )
  state.model.amount = '10.01'
  state.model.reason = '部分撤销'
  await state.calculate()
  assert.equal(received.sourceEntryId, 'offset')
  assert.equal(received.accountVersion, 7)
  assert.equal(received.amount, '10.01')
  await state.confirmation.submit()
  await state.confirmation.submit()
  assert.equal(state.confirmation.result.value.entry.cashAmount, '0.00')
  assert.equal(saved, 1)
  assert.equal(globalThis.__fundRecovery.read(), undefined)
  unmount()
})

test('退回余额未知结果重挂载仍发送同一原请求；409不丢未知资金事实', async () => {
  globalThis.__fundRecovery = storage()
  const calls = []
  const api = {
    previewFundReturn: async () => ({ token: 'return-token', amount: '10.01' }),
    confirmFundReturn: async (_p, request) => {
      calls.push(structuredClone(request))
      if (calls.length === 1) throw Error('network')
      if (calls.length === 2) throw { response: { status: 409 } }
      return { account: { balance: '60.00' }, entry: { id: 'returned' } }
    }
  }
  let current = mount(
    () => useFundReturn('project', { account: { version: 1 }, entry: { id: 'offset', amount: '-10.01' } }, () => {}),
    api
  )
  current.state.model.reason = '撤销'
  await current.state.calculate()
  await current.state.confirmation.submit()
  assert.equal(current.state.confirmation.uncertain.value, true)
  current.unmount()
  current = mount(() => useFundReturn('project', {}, () => {}), api)
  assert.equal(current.state.model.sourceEntryId, 'offset')
  assert.equal(current.state.confirmation.preview.value.token, 'return-token')
  await current.state.confirmation.submit()
  current.state.confirmation.invalidate()
  assert.equal(current.state.confirmation.uncertain.value, true)
  assert.ok(current.state.confirmation.preview.value)
  await current.state.confirmation.submit()
  assert.equal(calls[0].requestId, calls[2].requestId)
  assert.deepEqual(calls[0].input, calls[2].input)
  assert.equal(current.state.confirmation.result.value.entry.id, 'returned')
  current.unmount()
})

test('退回余额输入变更使迟到预览失效；上传未完成不能预览', async () => {
  globalThis.__fundRecovery = storage()
  let finish,
    calls = 0
  const { state, unmount } = mount(
    () => useFundReturn('project', { account: { version: 1 }, entry: { id: 'offset', amount: '-10.01' } }, () => {}),
    {
      previewFundReturn: () => {
        calls++
        return new Promise((resolve) => (finish = resolve))
      }
    }
  )
  const pending = state.calculate()
  await flush()
  state.model.amount = '2.00'
  finish({ token: 'old' })
  await pending
  assert.equal(state.confirmation.preview.value, undefined)
  state.filesChanged({ fileList: [{ uid: 'x', name: 'file.xlsx', status: 'uploading' }] })
  await state.calculate()
  assert.equal(calls, 1)
  assert.ok(globalThis.__fundMessages.length)
  unmount()
})

test('存入撤销发送原流水与版本，不提交可更改金额和收款方式', async () => {
  globalThis.__fundRecovery = storage()
  let received,
    saved = 0
  const { state, unmount } = mount(
    () =>
      useFundRevoke('project', { account: { version: 4 }, entry: { id: 'topup', amount: '100.01' } }, () => saved++),
    {
      previewFundRevoke: async (_p, i) => {
        received = i
        return { token: 'revoke', amount: '100.01', cashAmount: '-100.01' }
      },
      confirmFundRevoke: async () => ({
        entry: { id: 'reversed', cashAmount: '-100.01' },
        account: { balance: '0.00' }
      })
    }
  )
  state.model.reason = '撤销误收'
  await state.calculate()
  assert.equal(received.sourceEntryId, 'topup')
  assert.equal(received.accountVersion, 4)
  assert.equal('amount' in received, false)
  assert.equal('method' in received, false)
  await state.confirmation.submit()
  await state.confirmation.submit()
  assert.equal(saved, 1)
  assert.equal(state.confirmation.result.value.entry.cashAmount, '-100.01')
  unmount()
})
test('存入撤销网络未知重挂载只用原请求恢复，不能创建第二笔或丢来源', async () => {
  globalThis.__fundRecovery = storage()
  const calls = []
  const api = {
    previewFundRevoke: async () => ({ token: 'revoke', amount: '100.01' }),
    confirmFundRevoke: async (_p, r) => {
      calls.push(structuredClone(r))
      if (calls.length === 1) throw Error('network')
      return { entry: { id: 'done' } }
    }
  }
  let current = mount(
    () => useFundRevoke('project', { account: { version: 4 }, entry: { id: 'topup' } }, () => {}),
    api
  )
  current.state.model.reason = '误收'
  await current.state.calculate()
  await current.state.confirmation.submit()
  assert.equal(current.state.confirmation.uncertain.value, true)
  current.unmount()
  current = mount(() => useFundRevoke('project', {}, () => {}), api)
  assert.equal(current.state.model.sourceEntryId, 'topup')
  current.state.confirmation.invalidate()
  assert.ok(current.state.confirmation.preview.value)
  await current.state.confirmation.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(current.state.confirmation.result.value.entry.id, 'done')
  current.unmount()
})
test('撤销来源已使用的409保留原因，迟到预览与未完成附件均不可提交', async () => {
  globalThis.__fundRecovery = storage()
  let finish,
    calls = 0
  const { state, unmount } = mount(
    () => useFundRevoke('project', { account: { version: 4 }, entry: { id: 'topup' } }, () => {}),
    {
      previewFundRevoke: async () => {
        calls++
        if (calls === 1) return new Promise((r) => (finish = r))
        return { token: 'fresh' }
      },
      confirmFundRevoke: async () => {
        throw { response: { status: 409 }, message: '来源已使用' }
      }
    }
  )
  state.model.reason = '误收'
  const pending = state.calculate()
  await flush()
  state.model.reason = '填写撤销原因'
  finish({ token: 'old' })
  await pending
  assert.equal(state.confirmation.preview.value, undefined)
  state.filesChanged({ fileList: [{ uid: 'x', name: '凭证.pdf', status: 'uploading' }] })
  await state.calculate()
  assert.equal(calls, 1)
  state.filesChanged({ fileList: [] })
  await state.calculate()
  await state.confirmation.submit()
  assert.equal(state.model.reason, '填写撤销原因')
  assert.equal(state.confirmation.preview.value, undefined)
  assert.equal(state.confirmation.uncertain.value, false)
  unmount()
})
