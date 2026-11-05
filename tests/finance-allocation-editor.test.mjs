import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-allocation/useAllocationEditor.ts', import.meta.url))],
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
          { filter: /api\/financeAllocation|useProjectContext|@jetlinks-web\/utils|vue-i18n/ },
          (args) => ({ path: args.path, namespace: 'mock' })
        )
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeAllocation')
            ? ['queryAllocationRecipients']
                .map((name) => `export const ${name}=(...args)=>globalThis.__allocationApi.${name}(...args)`)
                .join('\n')
            : args.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__allocationProject; export const useProjectSwitchGuard=fn=>globalThis.__allocationGuards.push(fn)'
              : args.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...args)=>globalThis.__allocationMessages.push(args)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, mod, mod.exports)
const { useAllocationEditor } = mod.exports
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(api = {}, detail = undefined) {
  globalThis.__allocationApi = {
    getAllocation: async (_, id) => ({ id, version: 3, projectId: 'project' }),
    getAllocationOptions: async () => ({ types: { 1: '电子收据' }, sources: { 1: '自购' } }),
    ...api
  }
  globalThis.__allocationProject = { projectId: ref('project') }
  globalThis.__allocationGuards = []
  globalThis.__allocationMessages = []
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
  let state
  const app = renderer.createApp(
    defineComponent({
      setup() {
        state = useAllocationEditor('project', detail, (e) => globalThis.__allocationMessages.push(e))
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}

test('search retains frozen selected recipient display label', async () => {
  const m = mount(
    {
      queryAllocationRecipients: async () => ({ data: [{ id: 'other', name: '其他人', username: 'other' }], total: 1 })
    },
    { recipientId: 'archived', recipientName: '历史领用人', recipientUsername: 'old' }
  )
  await m.state.search('其他')
  assert.equal(m.state.model.recipientId, 'archived')
  assert.equal(m.state.recipients.value.find((u) => u.id === 'archived').name, '历史领用人')
  m.unmount()
})
test('late recipient search does not replace current results', async () => {
  const old = deferred()
  const m = mount({
    queryAllocationRecipients: (_, page, keyword) =>
      keyword === 'old'
        ? old.promise
        : Promise.resolve({ data: [{ id: 'new', name: '新', username: 'new' }], total: 1 })
  })
  const p = m.state.search('old')
  await m.state.search('new')
  old.resolve({ data: [{ id: 'old', name: '旧', username: 'old' }], total: 1 })
  await p
  assert.equal(m.state.recipients.value[0].id, 'new')
  m.unmount()
})
test('purchase range is computed from all books without rounding', () => {
  const m = mount()
  Object.assign(m.state.model, { bookCount: 99, numberCount: 9999, startNumber: 999999000000 })
  assert.equal(m.state.endNumber.value, 999999989900)
  m.state.model.startNumber = undefined
  assert.equal(m.state.endNumber.value, undefined)
  m.unmount()
})
test('recipient query failure surfaces toast and keeps selection', async () => {
  const m = mount(
    {
      queryAllocationRecipients: async () => {
        throw Error('source unavailable')
      }
    },
    { recipientId: 'kept', recipientName: '保留', recipientUsername: 'kept' }
  )
  await m.state.search()
  assert.equal(m.state.loading.value, false)
  assert.equal(m.state.model.recipientId, 'kept')
  assert.equal(globalThis.__allocationMessages.length, 1)
  m.unmount()
})
