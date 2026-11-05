import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-activity/useActivityWorkspace.ts', import.meta.url))],
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
          { filter: /api\/financeActivity|useProjectContext|@jetlinks-web\/utils|vue-i18n/ },
          (args) => ({ path: args.path, namespace: 'mock' })
        )
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeActivity')
            ? [
                'getActivityOptions',
                'queryActivities',
                'getActivity',
                'saveActivity',
                'setActivityState',
                'deleteActivity',
                'changeActivityEnd'
              ]
                .map((name) => `export const ${name}=(...args)=>globalThis.__activityApi.${name}(...args)`)
                .join('\n')
            : args.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__activityProject; export const useProjectSwitchGuard=fn=>globalThis.__activityGuards.push(fn)'
              : args.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...args)=>globalThis.__activityMessages.push(args)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, mod, mod.exports)
const { useActivityWorkspace } = mod.exports
const detail = (id) => ({
  activity: { id, version: 3, enabled: true, name: '活动' },
  config: { input: { name: '活动' } }
})
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(api = {}) {
  globalThis.__activityApi = {
    getActivity: async (_, id) => detail(id),
    getActivityOptions: async () => ({ spaces: [], types: [], standards: [] }),
    ...api
  }
  globalThis.__activityProject = { projectId: ref('project') }
  globalThis.__activityGuards = []
  globalThis.__activityMessages = []
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
        state = useActivityWorkspace()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
test('late detail from the old project cannot reopen or replace current state', async () => {
  const old = deferred()
  const { state, unmount } = mount({ getActivity: () => old.promise })
  const pending = state.select('old')
  globalThis.__activityProject.projectId.value = 'new-project'
  await nextTick()
  old.resolve(detail('old'))
  await pending
  assert.equal(state.open.value, false)
  assert.equal(state.detail.value, undefined)
  unmount()
})
test('read-only history remains viewable when the current dictionary is unavailable', async () => {
  let options = 0
  const { state, unmount } = mount({
    getActivityOptions: async () => {
      options++
      throw Error('disabled category')
    }
  })
  await state.select('activity', true)
  assert.equal(state.failed.value, false)
  assert.equal(options, 0)
  assert.equal(state.detail.value.activity.id, 'activity')
  assert.equal(globalThis.__activityGuards[0](), true)
  unmount()
})
test('save conflict retains editor and the original server version', async () => {
  const calls = []
  const { state, unmount } = mount({
    saveActivity: async (...args) => {
      calls.push(args)
      throw Error('conflict')
    }
  })
  await state.select('activity', false)
  await state.save({ name: '新名称', version: 99 })
  assert.equal(calls[0][2].version, 3)
  assert.equal(state.open.value, true)
  assert.equal(state.detail.value.activity.id, 'activity')
  assert.equal(globalThis.__activityMessages.at(-1)[1], 'error')
  unmount()
})
test('uploading prevents closing, project switching and accidental save', async () => {
  let calls = 0
  const { state, unmount } = mount({ saveActivity: async () => calls++ })
  await state.select(undefined, false)
  state.uploading.value = true
  state.close()
  await state.save({ name: '未上传完成' })
  assert.equal(state.open.value, true)
  assert.equal(calls, 0)
  assert.equal(globalThis.__activityGuards[0](), false)
  unmount()
})
test('date adjustment rejection preserves its original activity and date mode', async () => {
  const calls = []
  const { state, unmount } = mount({
    changeActivityEnd: async (...args) => {
      calls.push(args)
      throw Error('conflict')
    }
  })
  const row = { ...detail('activity'), runtimeStatus: 'RUNNING' }
  state.dateChange.value = { row, extend: true }
  await state.saveEnd('2027-01-01')
  assert.equal(calls[0][1].activity.version, 3)
  assert.equal(calls[0][3], true)
  assert.equal(state.dateChange.value.row.activity.id, 'activity')
  assert.equal(globalThis.__activityGuards[0](), false)
  unmount()
})
test('a pending state change accepts only one request and unlocks after rejection', async () => {
  const response = deferred()
  let calls = 0
  const { state, unmount } = mount({
    setActivityState: () => {
      calls++
      return response.promise
    }
  })
  const row = { ...detail('activity'), runtimeStatus: 'RUNNING' }
  const pending = state.change(row)
  await state.change(row)
  assert.equal(calls, 1)
  assert.equal(globalThis.__activityGuards[0](), false)
  response.reject(Error('denied'))
  await pending
  assert.equal(state.saving.value, false)
  assert.equal(globalThis.__activityGuards[0](), true)
  unmount()
})
