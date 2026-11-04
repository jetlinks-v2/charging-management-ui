import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const exports = ['getRefundOptions', 'getRefundSources', 'previewRefund', 'confirmRefund']
const result = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-cashier/useRefund.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(builder) {
        builder.onResolve({ filter: /api\/financeRefund|@jetlinks-web\/utils|vue-i18n/ }, (args) => ({
          path: args.path,
          namespace: 'mock'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeRefund')
            ? exports.map((name) => `export const ${name}=(...a)=>globalThis.__refundApi.${name}(...a)`).join('\n')
            : args.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:key=>key})'
              : 'export const onlyMessage=(...a)=>globalThis.__refundMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports)
const row = {
  line: {
    id: 'line',
    version: 3,
    paymentId: 'payment',
    amount: '10.01',
    refundedAmount: '0.00',
    fullName: '5G园区/101'
  },
  companyId: 'company',
  payerName: '张女士'
}
function mount(api = {}, recovery) {
  globalThis.__refundMessages = []
  globalThis.__refundApi = {
    getRefundOptions: async () => [
      { id: 'company', name: '物业公司', funding: [{ id: '1', method: '1', text: '现金' }] }
    ],
    getRefundSources: async () => [row],
    previewRefund: async () => ({
      token: 'token',
      total: '10.01',
      allocations: [{ sourceLineId: 'line', paymentId: 'payment', originalAmount: '10.01', refundedAmount: '0.00' }]
    }),
    confirmRefund: async () => ({ refund: { id: 'refund' }, lines: [] }),
    ...api
  }
  let state,
    saved = 0,
    stored
  const store = recovery || {
    read: () => stored,
    write: (value) => {
      stored = JSON.parse(JSON.stringify(value))
    },
    clear: () => {
      stored = undefined
    }
  }
  const props = reactive({ projectId: 'a', rows: [{ ...row }] })
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
        state = mod.exports.useRefund(props, () => saved++, store)
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
test('退款来源与公司后端读取、准确金额和来源版本提交、服务器决定分配', async () => {
  const calls = []
  const { state, saved, unmount } = mount({
    previewRefund: async (...args) => {
      calls.push(args)
      return { token: 'fresh', total: '1.01', allocations: [] }
    }
  })
  await flush()
  state.model.amount = '1.01'
  state.model.reason = '多收退回'
  await state.calculate()
  assert.equal(calls[0][1].companyId, 'company')
  assert.deepEqual(calls[0][1].items, [{ id: 'line', version: 3 }])
  assert.equal(calls[0][1].amount, '1.01')
  assert.equal(state.preview.value.total, '1.01')
  await state.submit()
  assert.equal(saved(), 1)
  assert.equal(state.result.value.refund.id, 'refund')
  unmount()
})
test('明确拒绝保留输入并要求重预览，网络未知复用原请求且权限错误也不丢弃', async () => {
  const calls = []
  let stage = 0
  const { state, unmount } = mount({
    confirmRefund: async (_p, input) => {
      calls.push(structuredClone(input))
      if (stage++ === 0) throw { response: { status: 409 } }
      if (stage === 2) throw Error('network')
      if (stage === 3) throw { response: { status: 403 } }
      return { refund: { id: 'original' }, lines: [] }
    }
  })
  await flush()
  state.model.reason = '保留这个原因'
  await state.calculate()
  await state.submit()
  assert.equal(state.preview.value, undefined)
  assert.equal(state.model.reason, '保留这个原因')
  await state.calculate()
  await state.submit()
  assert.equal(state.uncertain.value, true)
  const token = state.preview.value.token
  await state.submit()
  assert.equal(state.uncertain.value, true)
  assert.equal(state.preview.value.token, token)
  await state.submit()
  assert.equal(state.result.value.refund.id, 'original')
  assert.equal(calls[1].requestId, calls[2].requestId)
  assert.equal(calls[2].requestId, calls[3].requestId)
  unmount()
})
test('刷新恢复原退款请求，存储不可用不发送，输入变化使预览失效', async () => {
  let stored,
    calls = 0
  const recovery = {
    read: () => stored,
    write: (value) => {
      stored = JSON.parse(JSON.stringify(value))
    },
    clear: () => {
      stored = undefined
    }
  }
  const first = mount(
    {
      confirmRefund: async () => {
        throw Error('network')
      }
    },
    recovery
  )
  await flush()
  first.state.model.reason = '退款'
  await first.state.calculate()
  await first.state.submit()
  const id = stored.request.requestId
  first.unmount()
  const resumed = mount(
    {
      confirmRefund: async (_p, value) => {
        calls++
        assert.equal(value.requestId, id)
        return { refund: { id: 'saved' }, lines: [] }
      }
    },
    recovery
  )
  await flush()
  assert.equal(resumed.state.uncertain.value, true)
  await resumed.state.submit()
  assert.equal(stored, undefined)
  resumed.unmount()
  const denied = mount(
    {
      confirmRefund: async () => {
        calls++
      }
    },
    {
      read: () => undefined,
      write: () => {
        throw Error('storage')
      },
      clear: () => {}
    }
  )
  await flush()
  await denied.state.calculate()
  await denied.state.submit()
  assert.equal(calls, 1)
  assert.ok(denied.state.preview.value)
  denied.state.model.amount = '1.00'
  assert.equal(denied.state.preview.value, undefined)
  denied.unmount()
})

test('恢复临时款退款保留无应收来源，不伪造账单编号', async () => {
  const original = {
    request: { requestId: 'temporary-refund', token: 'token', input: { items: [{id:'source',version:4}], amount:'1.00', companyId:'company', method:'1', refundedAt:'2026-11-04T12:00:00', receiverName:'龚超', reason:'退临时款' } },
    preview: {token:'token',total:'1.00',companyName:'物业公司',allocations:[{sourceLineId:'source',paymentId:'payment',sourceType:'TEMPORARY',receivableId:null,fullName:'园区/101',customerName:'龚超',subjectName:'临时保洁',originalAmount:'10.01',refundedAmount:'0.00',amount:'1.00'}]}
  }
  let sent
  const {state,unmount}=mount({confirmRefund: async (_p,request)=>{sent=request;return {refund:{id:'refund'},lines:[]}}},
    {read:()=>structuredClone(original),write() {},clear() {}})
  await flush()
  assert.equal(state.sourceRows.value[0].line.sourceType,'TEMPORARY')
  assert.equal(state.sourceRows.value[0].line.receivableId,null)
  await state.submit()
  assert.deepEqual(sent,original.request)
  assert.equal(state.result.value.refund.id,'refund')
  unmount()
})
