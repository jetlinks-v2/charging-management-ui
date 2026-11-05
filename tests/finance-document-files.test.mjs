import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, reactive, nextTick } from 'vue'

const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-document/useDocumentFiles.ts', import.meta.url))],
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
            ? 'export const exportDocuments=(...a)=>globalThis.__documentsFile.api(...a)'
            : a.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:k=>k})'
              : 'export const onlyMessage=(...a)=>globalThis.__documentsFile.messages.push(a);export const downloadFileByUrl=(...a)=>globalThis.__documentsFile.downloads.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)

function mount(api) {
  globalThis.__documentsFile = { api, messages: [], downloads: [] }
  const project = ref('project-a'),
    query = reactive({ terms: [{ column: 'status', value: 'ISSUED', termType: 'eq' }] })
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
        state = mod.exports.useDocumentFiles(project, 'RECEIPT', () => query)
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, project, query, close: () => app.unmount() }
}

test('ledger export freezes applied reactive filters and rejects duplicate clicks', async () => {
  let finish
  const calls = []
  const m = mount((...args) => {
    calls.push(args)
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const task = m.state.exportRows('excel')
  m.query.terms[0].value = 'VOIDED'
  await m.state.exportRows('excel')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'project-a')
  assert.equal(calls[0][1], 'RECEIPT')
  assert.equal(calls[0][2].terms[0].value, 'ISSUED')
  finish(new Blob(['xlsx']))
  await task
  assert.equal(globalThis.__documentsFile.downloads.length, 1)
  assert.equal(m.state.exporting.value, false)
  m.close()
})

test('late previous project export is discarded and business failure uses toast', async () => {
  let finish
  const m = mount(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const task = m.state.exportRows('excel')
  m.project.value = 'project-b'
  await nextTick()
  finish(new Blob(['xlsx']))
  await task
  assert.equal(globalThis.__documentsFile.downloads.length, 0)
  m.close()
  const failed = mount(async () => {
    throw { response: { data: { message: '导出超过上限' } } }
  })
  await failed.state.exportRows('excel')
  assert.deepEqual(globalThis.__documentsFile.messages, [['导出超过上限', 'error']])
  assert.equal(globalThis.__documentsFile.downloads.length, 0)
  failed.close()
})
