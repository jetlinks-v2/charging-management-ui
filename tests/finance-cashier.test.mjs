import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const exports = ['getCashierOptions', 'getCashierPayers', 'previewCollection', 'collectPayment']
const result = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-cashier/useCashier.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(builder) {
        builder.onResolve({ filter: /api\/financeCashier|@jetlinks-web\/utils|vue-i18n/ }, (args) => ({
          path: args.path,
          namespace: 'mock'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeCashier')
            ? exports.map((name) => `export const ${name}=(...a)=>globalThis.__cashierApi.${name}(...a)`).join('\n')
            : args.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:key=>key})'
              : 'export const onlyMessage=(...a)=>globalThis.__cashierMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports)
const row = { id: 'bill', version: 3, arrears: '10.01', customerName: '龚超', fullName: '5G园区/101' }
function mount(api = {}, recovery, overrides = {}) {
  globalThis.__cashierMessages = []
  globalThis.__cashierApi = {
    getCashierOptions: async () => [
      { id: 'company', name: '物业公司', funding: [{ id: '1', method: '1', text: '现金' }] }
    ],
    getCashierPayers: async () => [],
    previewCollection: async () => ({ token: 'token', total: '10.01', rows: [row] }),
    collectPayment: async () => ({ payment: { id: 'payment' }, lines: [] }),
    ...api
  }
  let state,
    saved = 0
  const props = reactive({ projectId: 'a', rows: [{ ...row }], ...overrides })
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
        state = mod.exports.useCashier(props, () => saved++, recovery)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, props, saved: () => saved, unmount: () => app.unmount() }
}
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
test('全额收款以精确字符串提交，正式金额采用后端预览', async () => {
  const calls = []
  const { state, unmount } = mount({
    previewCollection: async (...args) => {
      calls.push(args)
      return { token: 'fresh', total: '10.01', rows: [row] }
    }
  })
  await flush()
  await state.calculate()
  assert.equal(calls[0][0], 'a')
  assert.equal(calls[0][1].items[0].amount, '10.01')
  assert.equal(calls[0][1].tenders.length, 1)
  assert.equal(state.preview.value.total, '10.01')
  assert.equal(state.preview.value.token, 'fresh')
  unmount()
})
test('部分金额、非法金额和混合支付不能发送收款预览', async () => {
  let calls = 0
  const { state, unmount } = mount({
    previewCollection: async () => {
      calls++
    }
  })
  await flush()
  for (const amount of ['5.01', '', 'NaN']) {
    state.model.items[0].amount = amount
    state.model.tenders = [{ optionId: '1', amount }]
    await state.calculate()
    assert.equal(globalThis.__cashierMessages.at(-1)[0], 'Cashier.fullCollectionRequired')
  }
  state.model.items[0].amount = '10.01'
  state.model.tenders = [
    { optionId: '1', amount: '5.01' },
    { optionId: '1', amount: '5.00' }
  ]
  await state.calculate()
  assert.equal(globalThis.__cashierMessages.at(-1)[0], 'Cashier.singlePaymentRequired')
  assert.equal(calls, 0)
  unmount()
})
test('网络结果未知时保留原请求号和输入，重试不重复入账', async () => {
  const calls = []
  let tries = 0
  const { state, saved, unmount } = mount({
    collectPayment: async (...args) => {
      calls.push(args)
      if (!tries++) throw { isAxiosError: true }
      return { payment: { id: 'payment' }, lines: [] }
    }
  })
  await flush()
  await state.calculate()
  await state.submit()
  assert.equal(state.uncertain.value, true)
  assert.ok(state.preview.value)
  await state.submit()
  assert.equal(calls[0][1].requestId, calls[1][1].requestId)
  assert.deepEqual(calls[0][1], calls[1][1])
  assert.equal(state.result.value.payment.id, 'payment')
  assert.equal(saved(), 1)
  unmount()
})
test('明确拒绝保留填写内容并要求重新试算，不把错误渲染进页面', async () => {
  const { state, unmount } = mount({
    collectPayment: async () => {
      throw { response: { status: 409, data: { message: '账单金额已改变' } } }
    }
  })
  await flush()
  state.model.remark = '现金已核对'
  await state.calculate()
  await state.submit()
  assert.equal(state.preview.value, undefined)
  assert.equal(state.model.remark, '现金已核对')
  assert.equal(state.uncertain.value, false)
  assert.equal(globalThis.__cashierMessages.at(-1)[0], '账单金额已改变')
  unmount()
})
test('输入改变或项目变化时忽略旧预览响应', async () => {
  let resolve
  const pending = new Promise((r) => (resolve = r))
  const { state, props, unmount } = mount({ previewCollection: () => pending })
  await flush()
  const calculating = state.calculate()
  await flush()
  state.model.remark = '修改'
  resolve({ token: 'old', total: '10.01' })
  await calculating
  assert.equal(state.preview.value, undefined)
  props.projectId = 'b'
  await nextTick()
  assert.equal(state.preview.value, undefined)
  unmount()
})
test('超大金额合计不经过浮点数，支付不平或附件未上传不能试算', async () => {
  let calls = 0
  const { state, unmount } = mount({
    previewCollection: async () => {
      calls++
      return { token: 'ok' }
    }
  })
  await flush()
  state.model.items[0].amount = '9007199254740993.01'
  assert.equal(state.total.value, '9007199254740993.01')
  state.model.tenders[0].amount = '0.01'
  await state.calculate()
  assert.equal(calls, 0)
  state.filesChanged({ fileList: [{ uid: 'upload', name: '凭证.pdf', status: 'uploading' }] })
  await state.calculate()
  assert.equal(calls, 0)
  unmount()
})

test('刷新后恢复原待确认请求，仍以同一幂等号核对结果', async () => {
  let stored,
    first = true
  const calls = []
  const recovery = {
    read: () => stored,
    write: (value) => {
      stored = JSON.parse(JSON.stringify(value))
    },
    clear: () => {
      stored = undefined
    }
  }
  const api = {
    collectPayment: async (_project, value) => {
      calls.push(value)
      if (first) {
        first = false
        throw { isAxiosError: true }
      }
      return { payment: { id: 'original' }, lines: [] }
    }
  }
  const initial = mount(api, recovery)
  await flush()
  await initial.state.calculate()
  await initial.state.submit()
  assert.ok(stored)
  initial.unmount()
  const resumed = mount(api, recovery)
  await flush()
  assert.equal(resumed.state.uncertain.value, true)
  assert.equal(resumed.state.model.items[0].amount, '10.01')
  await resumed.state.submit()
  assert.equal(calls[0].requestId, calls[1].requestId)
  assert.equal(stored, undefined)
  assert.equal(resumed.state.result.value.payment.id, 'original')
  resumed.unmount()
})
test('不能可靠保留原请求时不发送收款，损坏的待确认数据不会被新请求覆盖', async () => {
  let calls = 0
  const { state, unmount } = mount(
    {
      collectPayment: async () => {
        calls++
      }
    },
    {
      read: () => undefined,
      write: () => {
        throw Error('storage denied')
      },
      clear: () => {}
    }
  )
  await flush()
  await state.calculate()
  await state.submit()
  assert.equal(calls, 0)
  assert.ok(state.preview.value)
  unmount()
  const broken = mount(
    {
      previewCollection: async () => {
        calls++
      }
    },
    {
      read: () => {
        throw Error('broken')
      },
      write: () => {},
      clear: () => {}
    }
  )
  await flush()
  await broken.state.calculate()
  assert.equal(calls, 0)
  assert.equal(broken.state.recoveryFailed.value, true)
  broken.unmount()
})

test('减免带入确认请求并初始化净收款，公司锁定账单公司，恢复沿原减免请求', async () => {
  const calls = []
  const reduction = { mode: 'AMOUNT', value: '1.01', reason: '柜台优惠' }
  const { state, unmount } = mount(
    {
      previewCollection: async (_project, payload) => {
        calls.push(payload)
        return { token: 'discount', total: '9.00', rows: [row] }
      }
    },
    undefined,
    { reduction, rows: [{ ...row, companyId: 'company' }] }
  )
  await flush()
  assert.equal(state.model.items[0].amount, '9.00')
  assert.equal(state.model.tenders[0].amount, '9.00')
  assert.equal(state.model.companyId, 'company')
  await state.calculate()
  assert.deepEqual(calls[0].reduction, reduction)
  assert.equal(calls[0].items[0].amount, '9.00')
  unmount()
})
