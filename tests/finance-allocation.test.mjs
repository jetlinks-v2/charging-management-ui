import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-allocation/useAllocationWorkspace.ts', import.meta.url))],
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
            ? [
                'getAllocationOptions',
                'queryAllocations',
                'getAllocation',
                'saveAllocation',
                'deleteAllocation',
                'queryAllocationNumbers',
                'queryAllocationLogs',
                'setAllocationNumberState'
              ]
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
const { useAllocationWorkspace } = mod.exports
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(api = {}) {
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
        state = useAllocationWorkspace()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
test('readonly details do not load maintenance options and cannot save', async () => {
  let reads = 0,
    writes = 0
  const m = mount({
    getAllocationOptions: async () => {
      reads++
      throw Error('should not read')
    },
    saveAllocation: async () => {
      writes++
    }
  })
  await m.state.select('book')
  assert.equal(m.state.readOnly.value, true)
  assert.equal(m.state.detail.value.id, 'book')
  await m.state.save({})
  assert.equal(reads, 0)
  assert.equal(writes, 0)
  m.unmount()
})
test('late selection cannot replace current book', async () => {
  const old = deferred()
  const m = mount({ getAllocation: (_, id) => (id === 'old' ? old.promise : Promise.resolve({ id: 'new' })) })
  const pending = m.state.select('old')
  await m.state.select('new')
  old.resolve({ id: 'old' })
  await pending
  assert.equal(m.state.detail.value.id, 'new')
  m.unmount()
})
test('closing invalidates inflight detail', async () => {
  const late = deferred()
  const m = mount({ getAllocation: () => late.promise })
  const p = m.state.select('old')
  m.state.close()
  late.resolve({ id: 'old' })
  await p
  assert.equal(m.state.open.value, false)
  assert.equal(m.state.detail.value, undefined)
  m.unmount()
})
test('save carries selected version and a failed save keeps editor visible with toast', async () => {
  const calls = []
  const m = mount({
    saveAllocation: async (...v) => {
      calls.push(v)
      throw Error('range overlap')
    }
  })
  await m.state.select('book', false)
  await m.state.save({ billCode: 'CODE' })
  assert.equal(calls[0][2].version, 3)
  assert.equal(m.state.open.value, true)
  assert.equal(m.state.failed.value, false)
  assert.equal(globalThis.__allocationMessages.length, 1)
  m.unmount()
})
test('project guard blocks an editor and active number confirmation', async () => {
  const m = mount()
  await m.state.select(undefined, false)
  assert.equal(globalThis.__allocationGuards[0](), false)
  m.state.close()
  assert.equal(globalThis.__allocationGuards[0](), true)
  m.state.numberTarget.value = { id: 'number' }
  assert.equal(globalThis.__allocationGuards[0](), false)
  m.unmount()
})
test('successful number change reloads book and table with original number version', async () => {
  let request
  const m = mount({
    setAllocationNumberState: async (...v) => {
      request = v
      return {}
    },
    getAllocation: async () => ({ id: 'book', projectId: 'project', version: 5 })
  })
  await m.state.select('book', true, 'pool')
  m.state.numberTarget.value = { id: 'number', version: 7, enabled: true }
  await m.state.changeNumber('破损')
  assert.equal(request[2].version, 7)
  assert.equal(request[2].enabled, true)
  assert.equal(m.state.detail.value.version, 5)
  assert.equal(m.state.numberTarget.value, undefined)
  m.unmount()
})
