import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, computed, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const names = [
  'getSettingOptions',
  'getSetting',
  'querySettings',
  'saveSetting',
  'batchSettings',
  'deleteSetting',
  'stopSetting',
  'generateSetting',
  'getSettingHouse',
  'queryBillingTasks',
  'retryBillingTask'
]
async function load(path) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
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
            {
              filter:
                /api\/financeSetting|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext|finance-setting\/useFinanceSpaceScope/
            },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? names.map((n) => `export const ${n}=(...a)=>globalThis.__settingApi.${n}(...a)`).join('\n')
              : args.path.includes('useFinanceSpaceScope')
                ? 'export const useFinanceSpaceScope=()=>globalThis.__settingScope;export const flattenSpaces=nodes=>nodes.flatMap(n=>[n,...flattenSpaces(n.children||[])])'
                : args.path.includes('useProjectContext')
                  ? 'export const useProjectSwitchGuard=g=>globalThis.__settingGuards.push(g)'
                  : args.path === 'vue-i18n'
                    ? 'export const useI18n=()=>({t:key=>key})'
                    : 'export const onlyMessage=(...a)=>globalThis.__settingMessages.push(a)'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useSettingWorkspace } = await load('../hooks/finance-setting/useSettingWorkspace.ts')
const { useSettingForm } = await load('../hooks/finance-setting/useSettingForm.ts')
const { useBillingTasks } = await load('../hooks/finance-setting/useBillingTasks.ts')
const context = (space = 'room', count = 1) => ({
  house: { spaceId: space, fullName: space, billingArea: '100.25' },
  customers: Array.from({ length: count }, (_, i) => ({ relationshipId: space + '-' + i, name: '客户' + i }))
})
const standard = {
  id: 'std',
  subjectId: 'sub',
  subjectName: '物业费',
  price: '999999999999999999.99',
  variablesSnapshot: [
    { variableCode: 'STANDARD_PRICE' },
    { variableCode: 'BILLING_AREA' },
    { variableCode: 'PERIOD_MONTHS' },
    { variableCode: 'BILLING_PERSON' }
  ]
}
const options = { projectSubjects: [{ id: 'issued', subjectId: 'sub' }], standards: [standard] }
const row = (id) => ({
  id,
  version: 4,
  spaceId: 'room',
  projectSubjectId: 'issued',
  standardId: 'std',
  customerRelationshipIds: ['room-0'],
  snapshot: { values: { STANDARD_PRICE: '1.23', BILLING_AREA: '100.25', BILLING_PERSON: '3' } }
})
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}
function mount(factory, api = {}) {
  globalThis.__settingApi = {
    getSettingOptions: async () => options,
    getSetting: async (_p, id) => row(id),
    getSettingHouse: async (_p, id) => context(id),
    saveSetting: async () => ({ generated: 1 }),
    ...api
  }
  globalThis.__settingMessages = []
  globalThis.__settingGuards = []
  const selectedId = ref(),
    tree = ref([{ id: 'building', children: [{ id: 'room' }] }])
  globalThis.__settingScope = {
    projectId: ref('a'),
    selectedId,
    tree,
    visibleTree: tree,
    selected: computed(() => (selectedId.value ? tree.value[0] : undefined))
  }
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
test('树选中后筛选所有后代并持续选中，查询保留项目和分页', async () => {
  const calls = []
  const { state, unmount } = mount(useSettingWorkspace, { querySettings: async (...a) => calls.push(a) })
  state.archive.selectedId.value = 'building'
  await nextTick()
  assert.deepEqual(state.params.value.terms, [{ column: 'spaceId', termType: 'in', value: ['building', 'room'] }])
  await state.request({ pageIndex: 2, pageSize: 12, terms: state.params.value.terms })
  assert.equal(calls[0][0], 'a')
  assert.equal(calls[0][1].pageIndex, 2)
  assert.equal(state.archive.selectedId.value, 'building')
  unmount()
})
test('详情只读不保存，编辑携带版本，切换项目阻止未提交抽屉且丢弃迟到详情', async () => {
  const pending = deferred(),
    saves = []
  const { state, unmount } = mount(useSettingWorkspace, {
    getSetting: async (_p, id) => (id === 'old' ? pending.promise : row(id)),
    saveSetting: async (...a) => {
      saves.push(a)
      return { generated: 1 }
    }
  })
  await state.select(row('view'))
  await state.save([{}])
  assert.equal(saves.length, 0)
  await state.select(row('edit'), false)
  assert.equal(globalThis.__settingGuards[0](), false)
  await state.save([{}])
  assert.equal(saves[0][2].version, 4)
  assert.equal(state.open.value, false)
  const old = state.select(row('old'))
  await state.select(row('new'))
  pending.resolve(row('old'))
  await old
  assert.equal(state.detail.value.id, 'new')
  state.archive.projectId.value = 'b'
  await nextTick()
  assert.equal(state.detail.value, undefined)
  assert.equal(state.open.value, false)
  unmount()
})
test('批量失败保持抽屉并提示；重试成功后刷新且不误报单条成功', async () => {
  let attempts = 0,
    reloads = 0
  const { state, unmount } = mount(useSettingWorkspace, {
    batchSettings: async () => {
      if (!attempts++) throw new Error('末项无客户')
      return [{ generated: 1 }, { generated: 2 }]
    }
  })
  state.table.value = { reload: () => reloads++ }
  await state.select(undefined, false, 'batch')
  await state.save([{}, {}])
  assert.equal(state.open.value, true)
  assert.equal(reloads, 0)
  assert.equal(globalThis.__settingMessages.at(-1)[1], 'error')
  await state.save([{}, {}])
  assert.equal(state.open.value, false)
  assert.equal(reloads, 1)
  unmount()
})
test('表单按房屋唯一客户自动选择，多客户不猜测，提交排除可信变量', async () => {
  const emitted = []
  const props = reactive({ projectId: 'a', options, mode: 'batch', readOnly: false })
  const { state, unmount } = mount(() => useSettingForm(props, (a) => emitted.push(a)), {
    getSettingHouse: async (_p, id) => context(id, id === 'b' ? 2 : 1)
  })
  state.form.value = { validate: async () => {} }
  Object.assign(state.model, {
    projectSubjectId: 'issued',
    standardId: 'std',
    effectiveStartDate: '2024-02-01',
    variableValues: { STANDARD_PRICE: '0.01', BILLING_AREA: '0', BILLING_PERSON: '3' }
  })
  await state.addHouse('a')
  await state.addHouse('b')
  assert.deepEqual(state.targets.value[0].relationshipIds, ['a-0'])
  assert.deepEqual(state.targets.value[1].relationshipIds, [])
  await state.submit()
  assert.equal(emitted.length, 0)
  state.targets.value[1].relationshipIds = ['b-0', 'b-1']
  await state.submit()
  assert.equal(emitted[0].length, 2)
  assert.deepEqual(emitted[0][0].variableValues, { BILLING_PERSON: '3' })
  assert.deepEqual(emitted[0][1].customerRelationshipIds, ['b-0', 'b-1'])
  unmount()
})
test('更换项目使迟到房屋来源失效，详情不加载可编辑来源', async () => {
  const pending = deferred()
  let calls = 0
  const props = reactive({ projectId: 'a', options, mode: 'single', readOnly: false })
  const { state, unmount } = mount(() => useSettingForm(props, () => {}), {
    getSettingHouse: () => {
      calls++
      return pending.promise
    }
  })
  const old = state.addHouse('room')
  props.projectId = 'b'
  await nextTick()
  pending.resolve(context())
  await old
  assert.equal(state.targets.value.length, 0)
  props.readOnly = true
  props.detail = row('view')
  await nextTick()
  assert.equal(calls, 1)
  unmount()
})

test('任务重试失败不误报成功，重试沿用项目和原任务身份，完成后刷新', async () => {
  let calls = 0,
    reloads = 0
  const { state, unmount } = mount(() => useBillingTasks('fixed-project'), {
    retryBillingTask: async (project, id) => {
      assert.equal(project, 'fixed-project')
      assert.equal(id, 'task')
      if (!calls++) throw new Error('版本已变')
    }
  })
  state.table.value = { reload: () => reloads++ }
  assert.equal(globalThis.__settingGuards[0](), false)
  await state.retry({ id: 'task', status: 'SUCCEEDED' })
  assert.equal(calls, 0)
  await state.retry({ id: 'task', status: 'FAILED' })
  assert.equal(reloads, 0)
  assert.equal(globalThis.__settingMessages.at(-1)[1], 'error')
  await state.retry({ id: 'task', status: 'FAILED' })
  assert.equal(reloads, 1)
  assert.equal(globalThis.__settingMessages.at(-1)[0], 'Setting.taskRetryQueued')
  assert.equal(state.retrying.value, '')
  unmount()
})
