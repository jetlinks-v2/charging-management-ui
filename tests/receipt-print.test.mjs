import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, nextTick } from 'vue'

const bundle = await build({
  stdin: {
    contents: `export * from './hooks/finance-document/useReceiptPrint'; export * from './utils/receiptPdf';`,
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
        b.onResolve({ filter: /api\/financeDocument|@jetlinks-web\/utils|vue-i18n/ }, (a) => ({
          path: a.path,
          namespace: 'mock'
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeDocument')
            ? 'export const getReceiptPdf=(...a)=>globalThis.__receiptPrint(...a)'
            : a.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:key=>key})'
              : 'export const onlyMessage=(...a)=>globalThis.__receiptMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  mod,
  mod.exports
)
const { useReceiptPrint, receiptPdfResponse } = mod.exports
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
function mount(load) {
  globalThis.__receiptMessages = []
  globalThis.__receiptPrint = load
  const project = ref('project'),
    document = ref({ id: 'receipt', documentType: 'RECEIPT', documentNumber: 'SJ-001' })
  const revoked = [],
    created = []
  const urls = {
    createObjectURL: (blob) => {
      created.push(blob)
      return `blob:receipt-${created.length}`
    },
    revokeObjectURL: (url) => revoked.push(url)
  }
  const renderer = createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    setText() {},
    setElementText() {},
    parentNode() {},
    nextSibling() {},
    patchProp() {},
    insert() {},
    remove() {}
  })
  let state
  const app = renderer.createApp(
    defineComponent({
      setup() {
        state = useReceiptPrint(
          () => project.value,
          () => document.value,
          urls
        )
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, app, project, document, revoked, created }
}

test('PDF response rejects JSON or HTML masquerading as a successful file', async () => {
  const valid = new Blob(['%PDF-1.7\nreceipt'], { type: 'application/pdf' })
  assert.equal(await receiptPdfResponse({ data: valid }), valid)
  await assert.rejects(
    receiptPdfResponse(new Blob(['{"message":"无权打印"}'], { type: 'application/json' })),
    /无权打印/
  )
  await assert.rejects(receiptPdfResponse(new Blob(['<html>login</html>'], { type: 'application/pdf' })))
  await assert.rejects(receiptPdfResponse(new Blob([], { type: 'application/pdf' })))
})
test('preview loads once, uses a Blob URL and frees it on close or unmount', async () => {
  const calls = [],
    blob = new Blob(['%PDF-1.7'])
  const m = mount(async (...a) => {
    calls.push(a)
    return blob
  })
  const pending = m.state.show()
  await m.state.show()
  await pending
  assert.deepEqual(calls, [['project', 'receipt']])
  assert.equal(m.state.url.value, 'blob:receipt-1')
  m.state.close()
  assert.deepEqual(m.revoked, ['blob:receipt-1'])
  assert.equal(m.state.url.value, '')
  await m.state.show()
  m.app.unmount()
  assert.deepEqual(m.revoked, ['blob:receipt-1', 'blob:receipt-2'])
})
test('closing, changing receipt or unmounting ignores a late PDF result', async () => {
  for (const action of ['close', 'change', 'unmount']) {
    let complete
    const m = mount(() => new Promise((r) => (complete = r)))
    const pending = m.state.show()
    if (action === 'close') m.state.close()
    else if (action === 'change') {
      m.document.value = { ...m.document.value, id: 'other' }
      await nextTick()
    } else m.app.unmount()
    complete(new Blob(['%PDF-1.7']))
    await pending
    assert.equal(m.state.url.value, '')
    assert.equal(m.created.length, 0)
    if (action !== 'unmount') m.app.unmount()
  }
})
test('server failures use toast and leave the preview closed without changing the detail', async () => {
  const m = mount(async () => {
    throw { response: { data: new Blob(['{"message":"空间权限已变化"}'], { type: 'application/json' }) } }
  })
  await m.state.show()
  assert.equal(m.state.open.value, false)
  assert.equal(m.state.busy.value, false)
  assert.deepEqual(globalThis.__receiptMessages, [['空间权限已变化', 'error']])
  assert.equal(m.document.value.id, 'receipt')
  m.app.unmount()
})
test('switching project closes and frees the previous PDF, invoices never call receipt print API', async () => {
  const calls = [],
    m = mount(async (...a) => {
      calls.push(a)
      return new Blob(['%PDF-1.7'])
    })
  await m.state.show()
  m.project.value = 'other-project'
  await flush()
  assert.equal(m.state.open.value, false)
  assert.deepEqual(m.revoked, ['blob:receipt-1'])
  m.document.value = { ...m.document.value, documentType: 'INVOICE' }
  await flush()
  await m.state.show()
  assert.equal(calls.length, 1)
  m.app.unmount()
})
