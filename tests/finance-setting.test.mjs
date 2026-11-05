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
  'querySettingHouses',
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
const { useSettingTargetList } = await load('../hooks/finance-setting/useSettingTargetList.ts')
const { useSettingHousePicker } = await load('../hooks/finance-setting/useSettingHousePicker.ts')
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

test('单房多标准全部走原子批量接口，末项失败保持表单且不刷新', async () => {
  let batches = 0,
    singles = 0,
    reloads = 0
  const { state, unmount } = mount(useSettingWorkspace, {
    batchSettings: async (_project, inputs) => {
      batches++
      assert.equal(inputs.length, 2)
      throw new Error('第二项冲突')
    },
    saveSetting: async () => {
      singles++
    }
  })
  state.table.value = { reload: () => reloads++ }
  await state.select(undefined, false)
  await state.save([{ standardId: 'one' }, { standardId: 'two' }])
  assert.equal(batches, 1)
  assert.equal(singles, 0)
  assert.equal(reloads, 0)
  assert.equal(state.open.value, true)
  unmount()
})
const otherOptions = {
  projectSubjects: [...options.projectSubjects, { id: 'issued2', subjectId: 'sub2' }],
  standards: [...options.standards, { ...standard, id: 'std2', subjectId: 'sub2' }]
}
function fillRule(rule, second = false) {
  Object.assign(rule, {
    projectSubjectId: second ? 'issued2' : 'issued',
    standardId: second ? 'std2' : 'std',
    effectiveStartDate: '2024-02-01',
    variableValues: { BILLING_PERSON: '2', STANDARD_PRICE: '0.01' }
  })
}
test('多房多标准生成交叉组合，每条保留明确客户且不提交可信变量', async () => {
  const emitted = []
  const props = reactive({ projectId: 'a', options: otherOptions, mode: 'batch', readOnly: false })
  const { state, unmount } = mount(() => useSettingForm(props, (inputs) => emitted.push(inputs)))
  fillRule(state.model)
  state.addRule()
  fillRule(state.rules.value[1], true)
  await state.addHouses(['a', 'b', 'a'])
  await state.submit()
  assert.equal(emitted[0].length, 4)
  assert.deepEqual(
    emitted[0].map((r) => [r.spaceId, r.standardId]),
    [
      ['a', 'std'],
      ['b', 'std'],
      ['a', 'std2'],
      ['b', 'std2']
    ]
  )
  assert.deepEqual(emitted[0][3].customerRelationshipIds, ['b-0'])
  assert.deepEqual(emitted[0][3].variableValues, { BILLING_PERSON: '2' })
  unmount()
})
test('末条标准缺失变量或同科目日期重叠时整批不提交，客户必须是当前关联', async () => {
  const emitted = []
  const props = reactive({ projectId: 'a', options: otherOptions, mode: 'single', readOnly: false })
  const { state, unmount } = mount(() => useSettingForm(props, (inputs) => emitted.push(inputs)))
  fillRule(state.model)
  state.addRule()
  fillRule(state.rules.value[1], true)
  await state.addHouse('a')
  state.rules.value[1].variableValues = {}
  await state.submit()
  assert.equal(emitted.length, 0)
  fillRule(state.rules.value[1])
  await state.submit()
  assert.equal(emitted.length, 0)
  assert.equal(globalThis.__settingMessages.at(-1)[0], 'Setting.overlappingRules')
  fillRule(state.rules.value[1], true)
  state.targets.value[0].relationshipIds = ['unrelated']
  await state.submit()
  assert.equal(emitted.length, 0)
  state.targets.value[0].relationshipIds = ['a-0']
  await state.submit()
  assert.equal(emitted[0].length, 2)
  unmount()
})
test('多选房屋来源任一失败不部分加入，200条上限在提交前检查', async () => {
  const emitted = []
  const props = reactive({ projectId: 'a', options, mode: 'batch', readOnly: false })
  const { state, unmount } = mount(() => useSettingForm(props, (inputs) => emitted.push(inputs)), {
    getSettingHouse: async (_p, id) => {
      if (id === 'bad') throw new Error('来源失败')
      return context(id)
    }
  })
  await state.addHouse('original')
  await state.addHouses(['good', 'bad'])
  assert.deepEqual(
    state.targets.value.map((r) => r.context.house.spaceId),
    ['original']
  )
  assert.match(globalThis.__settingMessages.at(-1)[0], /bad/)
  fillRule(state.model)
  state.targets.value = Array.from({ length: 201 }, (_, i) => ({
    context: context(String(i)),
    relationshipIds: [i + '-0']
  }))
  await state.submit()
  assert.equal(emitted.length, 0)
  assert.equal(globalThis.__settingMessages.at(-1)[0], 'Setting.batchLimit')
  unmount()
})
test('批量选房保留跨页选择，排除已加入房屋并限制数量，旧项目响应不能覆盖新项目', async () => {
  const pending = deferred()
  const props = reactive({ projectId: 'a', selectedIds: ['existing'], limit: 3 })
  const { state, unmount } = mount(() => useSettingHousePicker(props), {
    querySettingHouses: async (project, query) =>
      project === 'a' && query.pageIndex === 1 ? pending.promise : { data: [{ spaceId: project }], total: 16 }
  })
  await nextTick()
  state.select(['existing', 'one'])
  assert.deepEqual(state.selected.value, ['one'])
  const old = state.load(1)
  state.select(['one', 'two'])
  assert.deepEqual(state.selected.value, ['one', 'two'])
  state.select(['one', 'two', 'three'])
  assert.equal(state.selected.value.length, 2)
  props.projectId = 'b'
  await nextTick()
  pending.resolve({ data: [{ spaceId: 'stale' }], total: 99 })
  await old
  assert.equal(state.rows.value[0].spaceId, 'b')
  assert.equal(state.selected.value.length, 0)
  unmount()
})

test('已选房屋分页保留收费对象，全部客户操作按各自房屋匹配且保存中不可改动', async () => {
  const draft = reactive({ targets: Array.from({ length: 6 }, (_, i) => ({ context: context(String(i), 2), relationshipIds: [] })), busy: false, batch: true, canChoose: true })
  const { state, unmount } = mount(() => useSettingTargetList(() => draft))
  assert.equal(state.pending.value, 6)
  state.pagination.value.onChange(2)
  state.selectAllCustomers()
  assert.deepEqual(draft.targets[5].relationshipIds, ['5-0', '5-1'])
  assert.equal(state.pending.value, 0)
  draft.busy = true
  state.removeHouse('5'); assert.equal(draft.targets.length, 6)
  draft.targets[0].relationshipIds = []
  state.selectAllCustomers(); assert.deepEqual(draft.targets[0].relationshipIds, [])
  draft.busy = false
  state.removeHouse('5'); await nextTick()
  assert.equal(state.page.value, 1)
  assert.deepEqual(draft.targets[4].relationshipIds, ['4-0', '4-1'])
  unmount()
})
