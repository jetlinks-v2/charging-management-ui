import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const methods = ['getPrepayOptions', 'createPrepayQuote', 'confirmPrepay']
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-prepay/usePrepay.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /api\/financePrepay|api\/financeCashier|@jetlinks-web\/utils|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financePrepay')
            ? methods.map((n) => `export const ${n}=(...a)=>globalThis.__prepayApi.${n}(...a)`).join('\n')
            : a.path.includes('financeCashier')
              ? 'export const getCashierOptions=(...a)=>globalThis.__prepayApi.getCashierOptions(...a)'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__prepayMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const setting = {
  id: 'setting',
  subjectName: '物业费',
  standardName: '月标准',
  companyId: 'company',
  settlementMethod: 'MONTHLY',
  payers: [{ relationshipId: 'payer', name: '龚超' }],
  activities: [{ id: 'activity', name: '充二赠一', tiers: [{ paidMonths: 2, giftMonths: 1 }] }]
}
const quote = {
  id: 'quote',
  version: 0,
  status: 'OPEN',
  expiresAt: Date.now() + 600000,
  houseName: '5G园区/101',
  payerName: '龚超',
  payAmount: '246.62',
  originalAmount: '369.93',
  lines: [
    {
      type: 'FUTURE',
      start: '2026-11-01',
      end: '2026-11-30',
      originalAmount: '123.31',
      paidAmount: '82.21',
      discountAmount: '41.10'
    }
  ]
}
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
function mount(overrides = {}, recovery) {
  globalThis.__prepayMessages = []
  globalThis.__prepayApi = {
    getPrepayOptions: async () => [setting],
    getCashierOptions: async () => [
      { id: 'company', name: '物业公司', funding: [{ id: 'cash', method: '1', text: '现金' }] }
    ],
    createPrepayQuote: async () => quote,
    confirmPrepay: async () => ({ payment: { id: 'payment' }, lines: [] }),
    ...overrides
  }
  let state,
    saved = 0
  const props = reactive({ projectId: 'project', spaceId: 'room', spaceName: '5G园区/101' })
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
        state = mod.exports.usePrepay(props, () => saved++, recovery)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, props, saved: () => saved, unmount: () => app.unmount() }
}
test('无欠费表格也按房屋获取设置，报价只提交设置客户和档位', async () => {
  const calls = []
  const { state, unmount } = mount({
    createPrepayQuote: async (...a) => {
      calls.push(a)
      return quote
    }
  })
  await flush()
  assert.equal(state.model.settingId, 'setting')
  assert.equal(state.model.payerRelationshipId, 'payer')
  state.model.activityId = 'activity'
  state.model.tierIndex = 0
  await state.calculate()
  assert.deepEqual(
    { ...calls[0][1], requestId: 'id' },
    {
      requestId: 'id',
      settingId: 'setting',
      payerRelationshipId: 'payer',
      activityId: 'activity',
      paidMonths: 2,
      giftMonths: 1
    }
  )
  assert.equal(state.total.value, '246.62')
  assert.deepEqual(state.model.tenders, [{ optionId: 'cash', amount: '246.62' }])
  unmount()
})
test('网络未知后冻结原确认请求，篡改表单重试仍发同一原请求', async () => {
  const calls = []
  let attempt = 0,
    stored
  const recovery = {
    read: () => stored,
    write: (v) => {
      stored = structuredClone(v)
    },
    clear: () => {
      stored = undefined
    }
  }
  const { state, saved, unmount } = mount(
    {
      confirmPrepay: async (...a) => {
        calls.push(structuredClone(a))
        if (!attempt++) throw new Error('network')
        return { payment: { id: 'paid' }, lines: [] }
      }
    },
    recovery
  )
  await flush()
  await state.calculate()
  await state.submit()
  assert.equal(state.uncertain.value, true)
  assert.ok(stored)
  state.model.remark = '不应发送'
  state.model.tenders[0].amount = '999.99'
  await state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(saved(), 1)
  assert.equal(stored, undefined)
  unmount()
})
test('刷新重挂载按存储原报价和原确认恢复，不依赖设置仍存在', async () => {
  let stored,
    tries = 0
  const calls = []
  const recovery = {
    read: () => stored,
    write: (v) => {
      stored = structuredClone(v)
    },
    clear: () => {
      stored = undefined
    }
  }
  let view = mount(
    {
      confirmPrepay: async (...a) => {
        calls.push(structuredClone(a))
        throw new Error('network')
      }
    },
    recovery
  )
  await flush()
  await view.state.calculate()
  await view.state.submit()
  view.unmount()
  view = mount(
    {
      getPrepayOptions: async () => {
        throw new Error('must not reload')
      },
      confirmPrepay: async (...a) => {
        tries++
        calls.push(structuredClone(a))
        return { payment: { id: 'paid' }, lines: [] }
      }
    },
    recovery
  )
  await flush()
  assert.equal(view.state.uncertain.value, true)
  assert.equal(view.state.quote.value.id, 'quote')
  await view.state.submit()
  assert.equal(tries, 1)
  assert.deepEqual(calls[0], calls[1])
  view.unmount()
})
test('明确拒绝后保留录入信息、清除原报价，错误只消息提示', async () => {
  let stored
  const recovery = {
    read: () => stored,
    write: (v) => {
      stored = structuredClone(v)
    },
    clear: () => {
      stored = undefined
    }
  }
  const { state, unmount } = mount(
    {
      confirmPrepay: async () => {
        throw { response: { status: 409, data: { message: '报价已过期，请重新报价' } } }
      }
    },
    recovery
  )
  await flush()
  await state.calculate()
  state.model.remark = '凭证备注'
  await state.submit()
  assert.equal(state.quote.value, undefined)
  assert.equal(state.model.remark, '凭证备注')
  assert.equal(stored, undefined)
  assert.equal(globalThis.__prepayMessages.at(-1)[0], '报价已过期，请重新报价')
  unmount()
})
test('切换房屋或配置时忽略迟到报价，不允许旧房屋收款', async () => {
  let resolve
  const { state, props, unmount } = mount({ createPrepayQuote: () => new Promise((r) => (resolve = r)) })
  await flush()
  const job = state.calculate()
  await flush()
  props.spaceId = 'other'
  await nextTick()
  resolve(quote)
  await job
  assert.equal(state.quote.value, undefined)
  unmount()
})
test('支付不平、上传未完成或存储不可用都不能发送确认', async () => {
  let calls = 0
  const { state, unmount } = mount(
    {
      confirmPrepay: async () => {
        calls++
      }
    },
    {
      read: () => undefined,
      write: () => {
        throw new Error('quota')
      },
      clear() {}
    }
  )
  await flush()
  await state.calculate()
  state.model.tenders[0].amount = '0.01'
  await state.submit()
  assert.equal(calls, 0)
  state.model.tenders[0].amount = '246.62'
  state.filesChanged({ fileList: [{ uid: 'file', name: '凭证', status: 'uploading' }] })
  await state.submit()
  assert.equal(calls, 0)
  state.filesChanged({ fileList: [] })
  await state.submit()
  assert.equal(calls, 0)
  unmount()
})
test('季度普通月数不合法不发报价，支付合计使用整数分', async () => {
  let calls = 0
  const { state, unmount } = mount({
    getPrepayOptions: async () => [{ ...setting, settlementMethod: 'QUARTERLY' }],
    createPrepayQuote: async () => {
      calls++
      return { ...quote, payAmount: '9007199254740993.01' }
    }
  })
  await flush()
  state.model.paidMonths = 2
  await state.calculate()
  assert.equal(calls, 0)
  state.model.paidMonths = 3
  await state.calculate()
  assert.equal(state.tenderTotal.value, '9007199254740993.01')
  assert.equal(state.balanced.value, true)
  unmount()
})
test('异步表单校验时快速双击只发送一笔收款', async () => {
  let resolve,
    calls = 0
  const { state, unmount } = mount({
    confirmPrepay: async () => {
      calls++
      return { payment: { id: 'paid' }, lines: [] }
    }
  })
  await flush()
  await state.calculate()
  state.form.value = { validate: () => new Promise((r) => (resolve = r)) }
  const first = state.submit()
  const second = state.submit()
  resolve()
  await Promise.all([first, second])
  assert.equal(calls, 1)
  unmount()
})
test('恢复后显示冻结的公司和支付方式，切换属性也不会发往新项目', async () => {
  let stored
  const recovery = {
    read: () => stored,
    write: (v) => {
      stored = structuredClone(v)
    },
    clear: () => {
      stored = undefined
    }
  }
  let view = mount(
    {
      confirmPrepay: async () => {
        throw new Error('network')
      }
    },
    recovery
  )
  await flush()
  await view.state.calculate()
  await view.state.submit()
  view.unmount()
  const calls = []
  view = mount(
    {
      confirmPrepay: async (...a) => {
        calls.push(a)
        return { payment: { id: 'paid' }, lines: [] }
      }
    },
    recovery
  )
  await flush()
  assert.equal(view.state.companyName.value, '物业公司')
  assert.equal(view.state.funding.value[0].text, '现金')
  view.props.projectId = 'other'
  await view.state.submit()
  assert.equal(calls[0][0], 'project')
  view.unmount()
})

test('过期报价拒绝提交；确认结果未知后的业务错误不能丢弃原请求', async () => {
  let confirms = 0
  let view = mount({
    createPrepayQuote: async () => ({ ...quote, expiresAt: Date.now() - 1 }),
    confirmPrepay: async () => {
      confirms++
    }
  })
  await flush()
  await view.state.calculate()
  await view.state.submit()
  assert.equal(confirms, 0)
  assert.equal(view.state.quote.value, undefined)
  view.unmount()
  view = mount({
    confirmPrepay: async () => {
      if (!confirms++) throw new Error('network')
      throw { response: { status: 409 } }
    }
  })
  await flush()
  await view.state.calculate()
  await view.state.submit()
  await view.state.submit()
  assert.equal(view.state.uncertain.value, true)
  assert.equal(view.state.quote.value.id, 'quote')
  view.unmount()
})

test('候选加载失败有可重试状态，不冒充无可用收费设置', async () => {
  let tries = 0
  const { state, unmount } = mount({
    getPrepayOptions: async () => {
      if (!tries++) throw new Error('unavailable')
      return [setting]
    }
  })
  await flush()
  assert.equal(state.loadFailed.value, true)
  await state.load()
  assert.equal(state.loadFailed.value, false)
  assert.equal(state.settings.value.length, 1)
  unmount()
})
