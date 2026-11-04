import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const bundle = await build({
  stdin: {
    contents: `export * from './hooks/finance-document/useDocumentEditor';
    export * from './hooks/finance-document/useDocumentReverse';
    export * from './hooks/finance-document/useDocumentReopen';
    export * from './utils/documentSelection';`,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    loader: 'ts'
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /api\/financeDocument|useDocumentRecovery|@jetlinks-web\/utils|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeDocument')
            ? [
                'previewDocument',
                'confirmDocument',
                'reverseDocument',
                'getDocument',
                'previewDocumentReopen',
                'confirmDocumentReopen'
              ]
                .map((n) => `export const ${n}=(...a)=>globalThis.__documentApi.${n}(...a)`)
                .join('\n')
            : a.path.includes('useDocumentRecovery')
              ? 'export const useDocumentRecovery=()=>{throw Error("Recovery must be injected")}'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__documentMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const api = mod.exports
const candidate = (id = 'bill', changes = {}) => ({
  sourceType: 'RECEIVABLE',
  sourceId: id,
  spaceId: 'room',
  fullName: '5G园区/101',
  customerId: 'customer',
  customerName: '龚超',
  subjectName: '物业服务费',
  standardName: '月标准',
  companyId: 'company',
  companyName: '原开票公司',
  availableAmount: '100.01',
  paidAmount: '0.00',
  allowedAmount: '100.01',
  taxRate: '0.06',
  goodsCode: '3040801',
  selectable: true,
  ...changes
})
const preview = (input) => ({
  ...input,
  token: 'token',
  amount: input.items[0].amount,
  taxAmount: '5.66',
  netAmount: '94.35',
  companyName: '原开票公司',
  sellerTaxNum: 'TAX',
  customerId: 'customer',
  customerName: '龚超',
  issueScene: 'BEFORE_PAYMENT',
  businessDate: '2026-11-05',
  rule: {},
  lines: input.items.map((v) => ({
    ...candidate(v.sourceId),
    ...v,
    taxAmount: '5.66',
    netAmount: '94.35',
    outputTax: '5.661132'
  }))
})
const document = {
  id: 'blue',
  version: 1,
  documentType: 'INVOICE',
  documentNumber: 'SIM-blue',
  buyerName: '龚超',
  companyName: '原开票公司',
  status: 'SIMULATED_ISSUED',
  amount: '100.01'
}
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
function memory() {
  let value
  return {
    read: () => (value ? structuredClone(value) : undefined),
    write: (v) => {
      value = structuredClone(v)
    },
    clear: () => {
      value = undefined
    }
  }
}
function mount(overrides = {}, recovery = memory(), reverse = false) {
  globalThis.__documentMessages = []
  globalThis.__documentApi = {
    previewDocument: async (_p, input) => preview(input),
    confirmDocument: async () => ({ document, buyer: {}, rule: {}, lines: [] }),
    reverseDocument: async () => ({ document: { ...document, status: 'SIMULATED_RED', amount: '-100.01' }, lines: [] }),
    getDocument: async () => ({
      document,
      buyer: { name: '原购方', taxNum: 'TAX' },
      rule: {},
      lines: [{ snapshot: { ...candidate(), amount: '100.01', collectionMethod: 'FULL', differenceAmount: '0.00' } }]
    }),
    previewDocumentReopen: async (_p, input) => ({
      ...preview({
        ...input,
        documentType: 'INVOICE',
        companyId: 'company',
        items: [{ ...candidate(), amount: '100.01' }]
      })
    }),
    confirmDocumentReopen: async () => ({
      document: {
        ...document,
        id: 'replacement',
        previousDocumentId: document.id,
        rootDocumentId: document.id,
        reopenCount: 1
      },
      buyer: {},
      lines: []
    }),
    ...overrides
  }
  let state,
    saved = 0
  const props = reactive({ projectId: 'project', type: 'INVOICE', document })
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
        state =
          reverse === 'reopen'
            ? api.useDocumentReopen(props, () => saved++, recovery)
            : reverse
              ? api.useDocumentReverse(props, () => saved++, recovery)
              : api.useDocumentEditor(props, () => saved++, recovery)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, props, recovery, saved: () => saved, unmount: () => app.unmount() }
}
test('跨页来源只允许同客户销方，可撤销且临时款按主单键去重', () => {
  const m = mount(),
    s = m.state
  s.toggle(candidate())
  s.toggle(candidate('other', { customerId: 'foreign' }))
  s.toggle(candidate('other', { companyId: 'foreign' }))
  s.toggle(candidate('other', { selectable: false }))
  assert.equal(s.selected.value.length, 1)
  s.toggle(candidate('temporary', { sourceType: 'TEMP_PAYMENT' }))
  assert.equal(s.selected.value.length, 2)
  s.toggle(candidate('temporary', { sourceType: 'TEMP_PAYMENT' }))
  assert.equal(s.selected.value.length, 1)
  assert.equal(s.buyer.name, '龚超')
  m.unmount()
})
test('金额以整数分校验，超JS安全整数仍能区分相差一分钱', () => {
  const row = candidate('large', { availableAmount: '9007199254740992.99' })
  const item = api.documentItem(row)
  assert.equal(api.validDocumentAmount(item, row), true)
  for (const amount of ['9007199254740993.00', '0', '-1', '1.001', 'abc'])
    assert.equal(api.validDocumentAmount({ ...item, amount }, row), false, amount)
})
test('差额必须有合法足额凭证和附件，全额模式禁止残留差额', () => {
  const item = {
    ...api.documentItem(candidate()),
    collectionMethod: 'DIFFERENTIAL',
    differenceAmount: '10.00',
    voucher: {
      type: '11',
      electronicInvoiceNumber: 'E2026',
      date: '2026-11-05',
      amount: '10.00',
      attachmentFileId: 'file',
      attachmentFileName: '凭证.pdf'
    }
  }
  assert.equal(api.validDocumentDeduction(item), true)
  for (const change of [
    { amount: '9.99' },
    { date: '2026-02-30' },
    { attachmentFileId: '' },
    { electronicInvoiceNumber: '' }
  ])
    assert.equal(api.validDocumentDeduction({ ...item, voucher: { ...item.voucher, ...change } }), false)
  assert.equal(api.validDocumentDeduction({ ...item, differenceAmount: '100.01' }), false)
  assert.equal(api.validDocumentDeduction({ ...item, collectionMethod: 'FULL' }), false)
  assert.equal(api.validDocumentDeduction(api.documentItem(candidate())), true)
})
test('预览提交用户输入且不覆盖冻结税率，正式开具复用token和请求号', async () => {
  const calls = []
  const m = mount({
    previewDocument: async (p, input) => {
      calls.push(['preview', p, structuredClone(input)])
      return preview(input)
    },
    confirmDocument: async (p, input) => {
      calls.push(['confirm', p, input])
      return { document }
    }
  })
  m.state.toggle(candidate())
  m.state.buyer.name = '购方企业抬头'
  m.state.invoiceType.value = '2'
  m.state.buyer.taxNum = 'TAX123'
  await m.state.calculate()
  assert.equal(m.state.step.value, 2)
  assert.equal(calls[0][2].buyer.name, '购方企业抬头')
  assert.equal(calls[0][2].invoiceType, '2')
  assert.equal('taxRate' in calls[0][2].items[0], false)
  await m.state.submit()
  await m.state.submit()
  assert.equal(calls.filter((v) => v[0] === 'confirm').length, 1)
  assert.equal(calls[1][2].token, 'token')
  assert.equal(m.saved(), 1)
  assert.equal(m.recovery.read(), undefined)
  m.unmount()
})
test('输入改变废弃在途预览，延迟响应不能推进阶段', async () => {
  let finish
  const m = mount({
    previewDocument: async (_p, input) =>
      await new Promise((r) => {
        finish = () => r(preview(input))
      })
  })
  m.state.toggle(candidate())
  m.state.step.value = 1
  const task = m.state.calculate()
  await flush()
  m.state.items.value[0].amount = '30.00'
  finish()
  await task
  assert.equal(m.state.preview.value, undefined)
  assert.equal(m.state.step.value, 1)
  m.unmount()
})
test('异步表单校验期间互斥，未通过校验不请求预览', async () => {
  let validate,
    count = 0
  const m = mount({
    previewDocument: async (_p, input) => {
      count++
      return preview(input)
    }
  })
  m.state.toggle(candidate())
  m.state.form.value = {
    validate: () =>
      new Promise((_r, reject) => {
        validate = () => reject({ errorFields: ['buyer'] })
      })
  }
  const first = m.state.calculate()
  await m.state.calculate()
  assert.equal(m.state.busy.value, true)
  validate()
  await first
  assert.equal(count, 0)
  assert.equal(m.state.busy.value, false)
  m.unmount()
})
test('网络结果未知冻结原请求，改表单重试仍发送原购方原金额', async () => {
  const calls = []
  let attempt = 0
  const m = mount({
    confirmDocument: async (p, input) => {
      calls.push([p, structuredClone(input)])
      if (!attempt++) throw new Error('network')
      return { document }
    }
  })
  m.state.toggle(candidate())
  await m.state.calculate()
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  assert.equal(m.state.canClose.value, false)
  m.state.buyer.name = '篡改'
  m.state.items.value[0].amount = '1.00'
  m.state.toggle(candidate('other'))
  await m.state.calculate()
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(calls[1][1].input.buyer.name, '龚超')
  assert.equal(calls[1][1].input.items[0].amount, '100.01')
  assert.equal(m.saved(), 1)
  m.unmount()
})
test('重挂载从原预览恢复，无需重新获取实时来源或报价', async () => {
  const recovery = memory()
  let m = mount(
    {
      confirmDocument: async () => {
        throw new Error('network')
      }
    },
    recovery
  )
  m.state.toggle(candidate())
  await m.state.calculate()
  await m.state.submit()
  const original = recovery.read().request
  m.unmount()
  let received
  m = mount(
    {
      previewDocument: () => {
        throw new Error('must not re-preview')
      },
      confirmDocument: async (_p, input) => {
        received = input
        return { document }
      }
    },
    recovery
  )
  await flush()
  assert.equal(m.state.step.value, 2)
  assert.equal(m.state.uncertain.value, true)
  m.state.items.value[0].amount = '1.00'
  await m.state.submit()
  assert.deepEqual(received, original)
  m.unmount()
})
test('存储失败不发请求，损坏待确认记录阻止新开具', async () => {
  let count = 0
  let m = mount(
    {
      confirmDocument: async () => {
        count++
      }
    },
    {
      read() {},
      clear() {},
      write() {
        throw new Error('storage')
      }
    }
  )
  m.state.toggle(candidate())
  await m.state.calculate()
  await m.state.submit()
  assert.equal(count, 0)
  assert.equal(m.state.saving.value, false)
  m.unmount()
  m = mount(
    {},
    {
      read() {
        throw new Error('corrupt')
      },
      write() {},
      clear() {}
    }
  )
  assert.equal(m.state.failed.value, true)
  m.state.toggle(candidate())
  assert.equal(m.state.selected.value.length, 0)
  m.unmount()
})
test('明确业务拒绝回到可修改状态，保留表单且不把异常混进票据', async () => {
  const m = mount({
    confirmDocument: async () => {
      throw { response: { status: 409, data: { message: '额度已变化' } } }
    }
  })
  m.state.toggle(candidate())
  m.state.remark.value = '备注保留'
  await m.state.calculate()
  await m.state.submit()
  await flush()
  assert.equal(m.state.step.value, 1)
  assert.equal(m.state.uncertain.value, false)
  assert.equal(m.state.preview.value, undefined)
  assert.equal(m.state.remark.value, '备注保留')
  assert.equal(m.recovery.read(), undefined)
  assert.equal(globalThis.__documentMessages.at(-1)[0], '额度已变化')
  m.unmount()
})
test('红冲未知结果恢复同版本同原因，不能二次生成请求', async () => {
  const calls = []
  let attempt = 0
  const m = mount(
    {
      reverseDocument: async (p, type, input) => {
        calls.push([p, type, structuredClone(input)])
        if (!attempt++) throw Error('network')
        return { document }
      }
    },
    memory(),
    true
  )
  m.state.reason.value = '重复开具'
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  m.state.reason.value = '修改后的原因'
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(calls[0][2].input.reason, '重复开具')
  assert.equal(calls[0][2].input.version, 1)
  assert.equal(m.saved(), 1)
  m.unmount()
})

test('重开先读取冻结资料，仅提交购方纠错而不由前端指定来源金额税率', async () => {
  const calls = []
  const m = mount(
    {
      previewDocumentReopen: async (project, input) => {
        calls.push([project, structuredClone(input)])
        return preview({ ...input, documentType: 'INVOICE', items: [{ ...candidate(), amount: '100.01' }] })
      }
    },
    memory(),
    'reopen'
  )
  await flush()
  assert.equal(m.state.buyer.name, '原购方')
  assert.equal(m.state.detail.value.document.id, 'blue')
  m.state.buyer.name = '更正抬头'
  m.state.invoiceType.value = '2'
  m.state.reason.value = '抬头更正'
  await m.state.calculate()
  assert.equal(m.state.step.value, 1)
  assert.equal(calls[0][1].buyer.name, '更正抬头')
  assert.equal(calls[0][1].version, 1)
  assert.equal(calls[0][1].id, 'blue')
  assert.equal('items' in calls[0][1], false)
  assert.equal('amount' in calls[0][1], false)
  await m.state.submit()
  assert.equal(m.state.result.value.document.id, 'replacement')
  assert.equal(m.saved(), 1)
  m.unmount()
})

test('重开错误使用消息提示且保留输入，修改购方废弃预览', async () => {
  let fail = true
  const m = mount(
    {
      previewDocumentReopen: async (_p, input) => {
        if (fail) {
          fail = false
          throw { response: { status: 409, data: { message: '达到重开上限' } } }
        }
        return preview({ ...input, documentType: 'INVOICE', items: [{ ...candidate(), amount: '100.01' }] })
      }
    },
    memory(),
    'reopen'
  )
  await flush()
  m.state.reason.value = '更正'
  m.state.buyer.name = '纠错企业'
  await m.state.calculate()
  assert.equal(m.state.step.value, 0)
  assert.equal(m.state.buyer.name, '纠错企业')
  assert.ok(globalThis.__documentMessages.length)
  await m.state.calculate()
  assert.equal(m.state.step.value, 1)
  m.state.buyer.name = '第二次纠错'
  await flush()
  assert.equal(m.state.preview.value, undefined)
  assert.equal(m.state.step.value, 0)
  m.unmount()
})

test('重开结果未知恢复原请求，不重查原票或重新预览，项目切换不能篡改重试载荷', async () => {
  const recovery = memory(),
    calls = []
  let m = mount(
    {
      confirmDocumentReopen: async (project, input) => {
        calls.push([project, structuredClone(input)])
        throw Error('network')
      }
    },
    recovery,
    'reopen'
  )
  await flush()
  m.state.reason.value = '更正企业抬头'
  m.state.buyer.name = '更正企业'
  await m.state.calculate()
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  assert.equal(m.state.canClose.value, false)
  m.unmount()
  m = mount(
    {
      getDocument: async () => {
        throw Error('should not reload')
      },
      previewDocumentReopen: async () => {
        throw Error('should not preview')
      },
      confirmDocumentReopen: async (project, input) => {
        calls.push([project, structuredClone(input)])
        return { document: { ...document, id: 'replacement' } }
      }
    },
    recovery,
    'reopen'
  )
  await flush()
  assert.equal(m.state.buyer.name, '更正企业')
  assert.equal(m.state.step.value, 1)
  m.props.projectId = 'different'
  m.state.reason.value = '篡改'
  m.state.buyer.name = '篡改'
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(m.saved(), 1)
  assert.equal(recovery.read(), undefined)
  m.unmount()
})
