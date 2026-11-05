import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const names = [
  'getStandardOptions',
  'queryStandards',
  'getStandard',
  'saveStandard',
  'deleteStandard',
  'exportStandards',
  'validateStandardFormula',
  'getFormulaVariables',
  'saveFormulaVariable',
  'deleteFormulaVariable',
  'queryStandardTaxes'
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
            { filter: /api\/financeStandard|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext/ },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? names.map((n) => `export const ${n}=(...a)=>globalThis.__standardApi.${n}(...a)`).join('\n')
              : args.path.includes('useProjectContext')
                ? 'export const useProjectContext=()=>globalThis.__standardContext;export const useProjectSwitchGuard=g=>globalThis.__standardGuards.push(g)'
                : args.path === 'vue-i18n'
                  ? 'export const useI18n=()=>({t:key=>key})'
                  : 'export const onlyMessage=(...a)=>globalThis.__standardMessages.push(a);export const downloadFileByUrl=()=>{}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useStandardWorkspace } = await load('../hooks/finance-standard/useStandardWorkspace.ts')
const { useStandardForm } = await load('../hooks/finance-standard/useStandardForm.ts')
const { formulaDisplay } = await load('../hooks/finance-standard/formula.ts')
const { useFormulaValidation } = await load('../hooks/finance-standard/useFormulaValidation.ts')
const { useStandardFormulaEditor } = await load('../hooks/finance-standard/useStandardFormulaEditor.ts')
const { useStandardTaxPicker } = await load('../hooks/finance-standard/useStandardTaxPicker.ts')
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}
const options = () => ({
  categories: [],
  subjects: [],
  variables: [],
  billingMethods: [],
  chargeRoundTypes: [],
  mantissas: [],
  settlementMethods: [],
  delayCalcForms: [],
  delayRoundTypes: [],
  delayBaseTypes: [],
  effectiveStatuses: []
})
const row = (id) => ({
  id,
  version: 7,
  standardCode: id,
  standardName: id,
  subjectId: 'sub',
  billingMethod: 'AREA',
  formulaExpression: '${STANDARD_PRICE}*${BILLING_AREA}*${PERIOD_MONTHS}',
  formulaDisplay: '',
  price: '999999999999999999.99',
  chargeRoundType: 2,
  mantissa: 0,
  settlementMethod: 'MONTHLY',
  taxItemId: 'tax',
  companyId: 'company',
  isDelay: 0,
  executeDate: null,
  cancelDate: null
})
function mount(factory, api = {}) {
  globalThis.__standardApi = Object.fromEntries(names.map((n) => [n, async () => []]))
  Object.assign(
    globalThis.__standardApi,
    {
      getStandardOptions: async () => options(),
      getStandard: async (_p, id) => row(id),
      saveStandard: async (_p, _id, input) => input
    },
    api
  )
  globalThis.__standardContext = {
    projectId: ref('a'),
    current: ref({ id: 'a', name: 'Project A' }),
    refresh: async () => {}
  }
  globalThis.__standardMessages = []
  globalThis.__standardGuards = []
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
test('late project options and detail cannot overwrite current project or reopened record', async () => {
  const pending = deferred()
  const { state, unmount } = mount(() => useStandardWorkspace(), {
    getStandard: (p, id) => (id === 'old' ? pending.promise : Promise.resolve(row(id)))
  })
  const old = state.select('old')
  await state.select('new')
  pending.resolve(row('old'))
  await old
  assert.equal(state.detail.value.id, 'new')
  globalThis.__standardContext.projectId.value = 'b'
  await nextTick()
  assert.equal(state.open.value, false)
  assert.equal(state.detail.value, undefined)
  unmount()
})
test('readonly or failed detail never saves; editing sends original version and locks project', async () => {
  const saved = []
  const { state, unmount } = mount(() => useStandardWorkspace(), { saveStandard: async (...args) => saved.push(args) })
  await nextTick()
  await state.metadata()
  await state.select('view')
  await state.save(row('view'))
  assert.equal(saved.length, 0)
  await state.select('edit', false)
  assert.equal(
    globalThis.__standardGuards.every((g) => g()),
    false
  )
  await state.save(row('edit'))
  assert.equal(saved.length, 1)
  assert.equal(saved[0][0], 'a')
  assert.equal(saved[0][2].version, 7)
  state.failed.value = true
  await state.save(row('bad'))
  assert.equal(saved.length, 1)
  unmount()
})
test('list and export share project, category, status and search; missing project issues no request', async () => {
  const calls = []
  const { state, unmount } = mount(() => useStandardWorkspace(), { queryStandards: async (...a) => calls.push(a) })
  state.selectedCategory.value = 'nested'
  assert.equal(state.project.value.name, 'Project A')
  state.effectiveStatus.value = 'EXPIRED'
  state.terms.value = [{ column: 'standardName', termType: 'like', value: '%water%' }]
  await state.request({ pageIndex: 3, pageSize: 12, terms: state.terms.value })
  assert.equal(calls[0][0], 'a')
  assert.equal(calls[0][2].categoryId, 'nested')
  assert.equal(calls[0][2].effectiveStatus, 'EXPIRED')
  assert.equal(calls[0][1].pageIndex, 3)
  globalThis.__standardContext.projectId.value = ''
  await nextTick()
  await state.request({ pageIndex: 0, pageSize: 12 })
  assert.equal(calls.length, 1)
  unmount()
})
test('formula labels replace only complete tokens and retain unknown codes visibly', () => {
  const display = formulaDisplay('${STANDARD_PRICE}*(${BILLING_AREA}+${UNKNOWN})', [
    { variableCode: 'STANDARD_PRICE', variableName: '单价' },
    { variableCode: 'BILLING_AREA', variableName: '计费面积' }
  ])
  assert.equal(display, '[费用_金额]=[单价]*([计费面积]+${UNKNOWN})')
})
test('form preserves decimal strings, validates dates and clears disabled delay settings before submit', async () => {
  const input = []
  const props = reactive({ open: true, detail: row('original'), options: options() })
  const { state, unmount } = mount(() => useStandardForm(props, (value) => input.push(value)))
  state.form.value = { validate: async () => {}, clearValidate() {} }
  state.model.rateAmount = '3'
  state.model.delayCalcForm = 0
  state.model.executeDate = '2026-12-02'
  state.model.cancelDate = '2026-12-01'
  await state.submit()
  assert.equal(input.length, 0)
  state.model.cancelDate = '2027-01-01'
  await state.submit()
  assert.equal(input.length, 1)
  assert.equal(input[0].price, '999999999999999999.99')
  assert.equal(input[0].version, 7)
  assert.equal(input[0].rateAmount, null)
  unmount()
})

test('late metadata from previous project is discarded and missing metadata prevents editing', async () => {
  const pending = deferred()
  const { state, unmount } = mount(() => useStandardWorkspace(), {
    getStandardOptions: (p) =>
      p === 'a' ? pending.promise : Promise.resolve({ ...options(), subjects: [{ id: 'b' }] })
  })
  globalThis.__standardContext.projectId.value = 'b'
  await nextTick()
  await state.metadata()
  pending.resolve({ ...options(), subjects: [{ id: 'a' }] })
  await nextTick()
  await nextTick()
  assert.equal(state.options.value.subjects[0].id, 'b')
  unmount()
})
test('failed detail can retry original id in original readonly mode', async () => {
  let attempt = 0
  const { state, unmount } = mount(() => useStandardWorkspace(), {
    getStandard: async (_project, id) => {
      if (++attempt === 1) throw new Error('temporary')
      return row(id)
    }
  })
  await state.select('retry-id', false)
  assert.equal(state.failed.value, true)
  await state.retry()
  assert.equal(state.failed.value, false)
  assert.equal(state.detail.value.id, 'retry-id')
  assert.equal(state.readOnly.value, false)
  unmount()
})
test('formula validation result becomes obsolete as soon as expression changes', async () => {
  const pending = deferred(),
    expression = ref('${STANDARD_PRICE}')
  const { state, unmount } = mount(
    () =>
      useFormulaValidation(
        () => 'a',
        () => expression.value,
        () => '[费用_金额]=[单价]'
      ),
    { validateStandardFormula: () => pending.promise }
  )
  const result = state.check()
  expression.value += '*2'
  await nextTick()
  pending.resolve({})
  await result
  assert.equal(state.valid.value, false)
  assert.equal(globalThis.__standardMessages.length, 0)
  unmount()
})
test('tax picker forwards server paging and retains selected item across pages', async () => {
  const calls = []
  const open = ref(false)
  const { state, unmount } = mount(() => useStandardTaxPicker(open, () => 'project'), {
    queryStandardTaxes: async (...a) => calls.push(a)
  })
  open.value = true
  await nextTick()
  state.selection.value.onChange(['selected'], [{ id: 'selected' }])
  await state.request({ pageIndex: 4, pageSize: 6, terms: [] })
  assert.equal(calls[0][0], 'project')
  assert.equal(calls[0][1].pageIndex, 4)
  assert.equal(state.selected.value.id, 'selected')
  unmount()
})

test('subject tree filters by actual subject id instead of directory and keeps selection', async () => {
  const calls = []
  const { state, unmount } = mount(() => useStandardWorkspace(), { queryStandards: async (...a) => calls.push(a) })
  state.selectTree(['subject:s1'])
  await state.request({ pageIndex: 0, pageSize: 12 })
  assert.equal(calls[0][2].subjectId, 's1')
  assert.equal(calls[0][2].categoryId, '')
  assert.deepEqual(state.treeSelection.value, ['subject:s1'])
  state.selectTree(['category:cat1'])
  assert.equal(state.selectedSubject.value, '')
  assert.equal(state.selectedCategory.value, 'cat1')
  unmount()
})

test('directory search retains ancestry and does not change selected subject or request scope', async () => {
  const data = options()
  data.categories = [
    { id: 'root', name: '总目录' },
    { id: 'child', parentId: 'root', name: '物业费' },
    { id: 'other', name: '停车费' }
  ]
  data.subjects = [
    { id: 'home', categoryId: 'child', name: '住宅物业费' },
    { id: 'park', categoryId: 'other', name: '停车' }
  ]
  const { state, unmount } = mount(() => useStandardWorkspace(), { getStandardOptions: async () => data })
  await state.metadata()
  state.selectTree(['subject:home'])
  state.treeKeyword.value = '住宅'
  assert.equal(state.visibleTree.value.length, 1)
  assert.equal(state.visibleTree.value[0].key, 'category:root')
  assert.equal(state.visibleTree.value[0].children[0].children[0].key, 'subject:home')
  assert.equal(state.selectedSubject.value, 'home')
  state.treeKeyword.value = '不存在'
  assert.deepEqual(state.visibleTree.value, [])
  assert.equal(state.filters.value.subjectId, 'home')
  state.treeKeyword.value = ''
  assert.equal(state.visibleTree.value.length, 2)
  unmount()
})

test('new standard requires a valid selected subject and form inherits its ownership and delay defaults', async () => {
  const data = options()
  data.subjects = [{ id: 'home', categoryId: 'child', name: '住宅物业费' }]
  data.billingMethods = [{ value: 'AREA', defaultExpression: '${STANDARD_PRICE}*${BILLING_AREA}' }]
  const { state, unmount } = mount(() => useStandardWorkspace(), { getStandardOptions: async () => data })
  await state.metadata()
  await state.select(undefined, false)
  assert.equal(state.open.value, false)
  state.selectTree(['subject:home'])
  assert.equal(state.canCreate.value, true)
  await state.select(undefined, false)
  assert.equal(state.open.value, true)
  unmount()
  const props = reactive({ open: true, options: data, selectedSubjectId: 'home' })
  const form = mount(() => useStandardForm(props, () => {}))
  assert.equal(form.state.model.subjectId, 'home')
  assert.equal(form.state.model.delayCalcForm, 0)
  assert.equal(form.state.model.delayRoundType, 0)
  assert.equal(form.state.model.delayBaseType, 'CURRENT_RECEIVABLE')
  form.unmount()
})

test('formula editing protects original on cancel and only confirms the validated current draft', async () => {
  const source = ref('${STANDARD_PRICE}')
  const confirmed = []
  const props = reactive({
    projectId: 'a',
    expression: source.value,
    variables: [{ variableCode: 'STANDARD_PRICE', variableName: '单价' }]
  })
  const { state, unmount } = mount(() => useStandardFormulaEditor(props, (value) => confirmed.push(value)))
  state.begin()
  state.draft.value = '${STANDARD_PRICE}*2'
  state.cancel()
  assert.equal(source.value, '${STANDARD_PRICE}')
  assert.deepEqual(confirmed, [])
  state.begin()
  state.draft.value = '${STANDARD_PRICE}*3'
  await state.confirm()
  assert.deepEqual(confirmed, ['${STANDARD_PRICE}*3'])
  assert.equal(state.open.value, false)
  unmount()
})

test('failed formula check keeps dialog open and does not apply invalid formula', async () => {
  const applied = []
  const { state, unmount } = mount(
    () =>
      useStandardFormulaEditor({ projectId: 'a', expression: '${STANDARD_PRICE}', variables: [] }, (value) =>
        applied.push(value)
      ),
    {
      validateStandardFormula: async () => {
        throw new Error('invalid formula')
      }
    }
  )
  state.begin()
  state.draft.value = 'bad('
  await state.confirm()
  assert.equal(state.open.value, true)
  assert.deepEqual(applied, [])
  unmount()
})
