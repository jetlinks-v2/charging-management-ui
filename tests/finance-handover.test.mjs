import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-handover/useHandoverEditor.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve({ filter: /api\/financeHandover|useHandoverRecovery|@jetlinks-web|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeHandover')
            ? ['previewHandover', 'confirmHandover']
                .map((n) => `export const ${n}=(...a)=>globalThis.__handoverApi.${n}(...a)`)
                .join('\n')
            : a.path.includes('useHandoverRecovery')
              ? 'export const useHandoverRecovery=()=>{throw Error("inject recovery")}'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__handoverMessages.push(a);export const getImageUrl=id=>"/file/"+id'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const memory = () => {
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
const quote = {
  token: 'token',
  sourceCount: 1,
  amount: '100.01',
  cashAmount: '60.00',
  lines: [
    {
      sourceType: 'PAYMENT',
      sourceId: 'payment',
      originalLineId: 'line',
      fullName: '园区/101',
      cashAmount: '60.00',
      amount: '100.01'
    }
  ]
}
const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}
function mount(overrides = {}, recovery = memory()) {
  globalThis.__handoverMessages = []
  globalThis.__handoverApi = {
    previewHandover: async () => structuredClone(quote),
    confirmHandover: async () => ({ batch: { id: 'batch' }, lines: [] }),
    ...overrides
  }
  const props = reactive({
    projectId: 'project',
    candidates: [{ id: 'payment', type: 'PAYMENT', version: 2, amount: 'FAKE', cashAmount: 'FAKE' }]
  })
  let state,
    saved = 0
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
        state = mod.exports.useHandoverEditor(props, () => saved++, recovery)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, props, saved: () => saved, recovery, unmount: () => app.unmount() }
}
test('交账先后端核对金额，确认不把列表金额传回后台', async () => {
  const calls = [],
    m = mount({
      previewHandover: async (p, i) => {
        calls.push([p, i])
        return structuredClone(quote)
      }
    })
  m.state.form.closingDate = '2026-11-05'
  m.state.form.remark = ' 原交账 '
  await m.state.calculate()
  assert.deepEqual(calls[0][1], {
    items: [{ id: 'payment', type: 'PAYMENT', version: 2 }],
    closingDate: '2026-11-05',
    remark: '原交账',
    attachmentFileId: undefined,
    attachmentName: undefined,
    attachments: []
  })
  assert.equal(m.state.preview.value.cashAmount, '60.00')
  assert.equal(m.state.preview.value.amount, '100.01')
  await m.state.submit()
  assert.equal(m.saved(), 1)
  assert.equal(m.state.locked.value, true)
  m.unmount()
})
test('交账日期备注附件改变必须重新核对，上传未完成不可提交', async () => {
  let previews = 0
  const m = mount({
    previewHandover: async () => {
      previews++
      return structuredClone(quote)
    }
  })
  await m.state.calculate()
  m.state.form.remark = '更正'
  await flush()
  assert.equal(m.state.preview.value, undefined)
  m.state.filesChanged({ fileList: [{ uid: 'f', name: '凭证.pdf', status: 'uploading' }] })
  await m.state.calculate()
  assert.equal(previews, 1)
  m.state.filesChanged({
    fileList: [{ uid: 'f', name: '凭证.pdf', status: 'done', response: { result: { id: 'file-id' } } }]
  })
  await m.state.calculate()
  assert.equal(previews, 2)
  assert.equal(m.state.form.attachmentFileId, 'file-id')
  m.unmount()
})
test('业务拒绝只toast且保留日期备注，不能继续使用旧核对token', async () => {
  const m = mount({
    confirmHandover: async () => {
      throw { response: { status: 409, data: { message: '业务已交账' } } }
    }
  })
  m.state.form.remark = '保留内容'
  await m.state.calculate()
  await m.state.submit()
  assert.equal(m.state.uncertain.value, false)
  assert.equal(m.state.preview.value, undefined)
  assert.equal(m.state.form.remark, '保留内容')
  assert.equal(m.recovery.read(), undefined)
  assert.ok(globalThis.__handoverMessages.some((x) => x[0] === '业务已交账'))
  m.unmount()
})
test('断网后锁定项目与载荷，重挂恢复相同请求号和原金额', async () => {
  const recovery = memory(),
    calls = []
  let m = mount(
    {
      confirmHandover: async (p, r) => {
        calls.push([p, structuredClone(r)])
        throw Error('network')
      }
    },
    recovery
  )
  m.state.form.remark = '原备注'
  await m.state.calculate()
  await m.state.submit()
  assert.equal(m.state.uncertain.value, true)
  assert.equal(m.state.canClose.value, false)
  m.unmount()
  m = mount(
    {
      confirmHandover: async (p, r) => {
        calls.push([p, structuredClone(r)])
        return { batch: { id: 'batch' } }
      }
    },
    recovery
  )
  await flush()
  assert.equal(m.state.form.remark, '原备注')
  m.props.projectId = 'other'
  m.state.form.remark = '修改但不提交'
  await m.state.submit()
  assert.deepEqual(calls[0], calls[1])
  assert.equal(m.state.preview.value.cashAmount, '60.00')
  assert.equal(recovery.read(), undefined)
  m.unmount()
})
test('存储失败时不能发送确认请求', async () => {
  let calls = 0
  const store = {
    ...memory(),
    write() {
      throw Error('storage')
    }
  }
  const m = mount(
    {
      confirmHandover: async () => {
        calls++
      }
    },
    store
  )
  await m.state.calculate()
  await m.state.submit()
  assert.equal(calls, 0)
  assert.equal(m.state.saving.value, false)
  m.unmount()
})

test('多条勾选明细按完整原单去重，五附件保留原文件信息且不提交列表金额', async () => {
  let input
  const m = mount({
    previewHandover: async (_project, value) => {
      input = value
      return structuredClone(quote)
    }
  })
  m.props.candidates.push({ ...m.props.candidates[0], selectionKey: 'second-line' })
  m.state.filesChanged({
    fileList: [1, 2, 3, 4, 5].map((n) => ({
      uid: String(n),
      name: `凭证${n}.pdf`,
      size: n * 100,
      status: 'done',
      response: { result: { id: `file-${n}` } }
    }))
  })
  await m.state.calculate()
  assert.equal(input.items.length, 1)
  assert.equal(input.attachments.length, 5)
  assert.deepEqual(input.attachments[4], { fileId: 'file-5', name: '凭证5.pdf', size: 500 })
  assert.equal('amount' in input, false)
  m.unmount()
})
