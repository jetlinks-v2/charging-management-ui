import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
const require = createRequire(import.meta.url)
const names = [
  'getCarrySubjects',
  'getCarryStandards',
  'queryCarryPlans',
  'getCarryPlan',
  'saveCarryPlan',
  'changeCarryState',
  'deleteCarryPlan',
  'queryCarryRuns',
  'getCarryRun',
  'queryCarryWorks',
  'getCarryWork',
  'queryCarryItems',
  'retryCarryRun'
]
const compiled = await build({
  entryPoints: ['useCarryWorkspace', 'useCarryHistory'].map((name) =>
    fileURLToPath(new URL('../hooks/finance-carry/' + name + '.ts', import.meta.url))
  ),
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
        builder.onResolve({ filter: /api\/financeCarry|useProjectContext|@jetlinks-web\/utils|vue-i18n/ }, (args) => ({
          path: args.path,
          namespace: 'mock'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeCarry')
            ? names.map((name) => `export const ${name}=(...a)=>globalThis.__carryApi.${name}(...a)`).join('\n')
            : args.path.includes('useProjectContext')
            ? 'export const useProjectContext=()=>globalThis.__carryProject; export const useProjectSwitchGuard=fn=>globalThis.__carryGuards.push(fn)'
            : args.path === 'vue-i18n'
            ? 'export const useI18n=()=>({t:key=>key})'
            : 'export const onlyMessage=(...a)=>globalThis.__carryMessages.push(a)'
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
const { useCarryWorkspace } = modules[0],
  { useCarryHistory } = modules[1]
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
const flush = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}
const plan = (id = 'plan') => ({
  plan: { id, version: 4, enabled: true },
  input: { name: id, subjectIds: ['subject'] }
})
const run = (id = 'run', status = 'PARTIAL') => ({ id, status, succeeded: 1, failed: 1, skipped: 0 })
function mount(factory, api = {}) {
  globalThis.__carryApi = {
    getCarrySubjects: async () => [],
    getCarryStandards: async () => [],
    getCarryPlan: async (_, id) => plan(id),
    ...api
  }
  globalThis.__carryProject = { projectId: ref('project') }
  globalThis.__carryMessages = []
  globalThis.__carryGuards = []
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

test('late plan response cannot reopen or overwrite details after project changes', async () => {
  const old = deferred(),
    mounted = mount(useCarryWorkspace, { getCarryPlan: () => old.promise })
  const loading = mounted.state.select('old')
  globalThis.__carryProject.projectId.value = 'other-project'
  await flush()
  old.resolve(plan('old'))
  await loading
  assert.equal(mounted.state.open.value, false)
  assert.equal(mounted.state.detail.value, undefined)
  mounted.unmount()
})

test('rejected save preserves selected plan and draft; retry uses the original version', async () => {
  let reject = true
  const calls = []
  const { state, unmount } = mount(useCarryWorkspace, {
    saveCarryPlan: async (...args) => {
      calls.push(args)
      if (reject) throw new Error('conflict')
    }
  })
  await state.select('plan', false)
  assert.equal(globalThis.__carryGuards[0](), false)
  await state.save({ name: 'revised', subjectIds: ['subject'], version: 99 })
  assert.equal(state.open.value, true)
  assert.equal(state.detail.value.plan.id, 'plan')
  assert.equal(calls[0][2].version, 4)
  assert.equal(globalThis.__carryMessages.at(-1)[1], 'error')
  reject = false
  await state.save({ name: 'revised', subjectIds: ['subject'] })
  assert.equal(state.open.value, false)
  assert.equal(calls[1][1], 'plan')
  unmount()
})

test('read-only detail cannot save or lock the project as an editor', async () => {
  let called = false
  const { state, unmount } = mount(useCarryWorkspace, {
    saveCarryPlan: async () => {
      called = true
    }
  })
  await state.select('plan', true)
  await state.save({ name: 'bad' })
  assert.equal(called, false)
  assert.equal(globalThis.__carryGuards[0](), true)
  unmount()
})

test('failed house detail has explicit recovery and only queries its original run and work', async () => {
  let fail = true
  const calls = []
  const { state, unmount } = mount(() => useCarryHistory({ projectId: 'p', planId: 'plan' }), {
    getCarryRun: async () => run(),
    getCarryWork: async () => {
      if (fail) throw new Error('denied')
      return { id: 'work' }
    },
    queryCarryItems: async (...args) => {
      calls.push(args)
    }
  })
  await state.selectRun(run())
  await state.selectWork({ id: 'work' })
  assert.equal(state.failed.value, true)
  assert.equal(state.work.value, undefined)
  fail = false
  await state.reloadDetail()
  assert.equal(state.failed.value, false)
  assert.equal(state.level.value, 'items')
  await state.request({ terms: [], pageIndex: 2, pageSize: 8 })
  assert.deepEqual(calls[0].slice(0, 4), ['p', 'plan', 'run', 'work'])
  assert.equal(calls[0][4].pageIndex, 2)
  state.back()
  assert.equal(state.level.value, 'works')
  state.back()
  assert.equal(state.level.value, 'runs')
  unmount()
})

test('an old navigation error cannot replace the new run and back discards pending detail', async () => {
  const old = deferred()
  const { state, unmount } = mount(() => useCarryHistory({ projectId: 'p', planId: 'plan' }), {
    getCarryRun: async (_, __, id) => (id === 'old' ? old.promise : run(id))
  })
  const pending = state.selectRun(run('old'))
  await state.selectRun(run('new'))
  old.reject(new Error('old failure'))
  await pending
  assert.equal(state.run.value.id, 'new')
  assert.equal(state.failed.value, false)
  assert.equal(globalThis.__carryMessages.length, 0)
  unmount()
})

test('retry locks project, suppresses double submit, and refreshes after a rejected request', async () => {
  const response = deferred()
  let calls = 0,
    reloads = 0
  const { state, unmount } = mount(() => useCarryHistory({ projectId: 'p', planId: 'plan' }), {
    retryCarryRun: () => {
      calls++
      return response.promise
    }
  })
  state.table.value = { reload: () => reloads++ }
  const action = state.retry(run())
  await state.retry(run())
  assert.equal(calls, 1)
  assert.equal(globalThis.__carryGuards[0](), false)
  response.reject(new Error('forbidden'))
  await action
  assert.equal(reloads, 1)
  assert.equal(state.retrying.value, false)
  assert.equal(globalThis.__carryGuards[0](), true)
  await state.retry(run('done', 'SUCCEEDED'))
  assert.equal(calls, 1)
  unmount()
})

test('standard options load with the project and selected scope is submitted without widening it', async () => {
  let saved
  const { state, unmount } = mount(useCarryWorkspace, {
    getCarryStandards: async (project) => [{ id: project + '-standard', subjectId: 'subject', name: '物业费' }],
    saveCarryPlan: async (_project, _id, value) => {
      saved = value
    }
  })
  await state.select(undefined, false)
  assert.equal(state.standards.value[0].id, 'project-standard')
  await state.save({ name: '限定标准', subjectIds: ['subject'], standardIds: ['project-standard'] })
  assert.deepEqual(saved.standardIds, ['project-standard'])
  unmount()
})

test('failed standard options keep the editor from saving an unverified scope', async () => {
  let saved = false
  const { state, unmount } = mount(useCarryWorkspace, {
    getCarryStandards: async () => {
      throw Error('offline')
    },
    saveCarryPlan: async () => {
      saved = true
    }
  })
  await state.select(undefined, false)
  await state.save({ name: '不可保存', subjectIds: ['subject'] })
  assert.equal(state.failed.value, true)
  assert.equal(saved, false)
  unmount()
})
