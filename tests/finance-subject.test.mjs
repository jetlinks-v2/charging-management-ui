import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, nextTick, reactive } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = [
  'getCategories',
  'getFeeTypes',
  'getArrearsOptions',
  'getSubject',
  'saveSubject',
  'deleteSubject',
  'deleteSubjects',
  'querySubjectImports',
  'saveCategory',
  'deleteCategory',
  'querySubjects',
  'queryProjectSubjects',
  'deleteProjectSubject',
  'getProjectSubject',
  'subjectTemplate',
  'importSubjects',
  'issueSubjects'
]
async function load(path) {
  const output = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: [
      {
        name: 'subject-boundaries',
        setup(builder) {
          builder.onResolve(
            { filter: /api\/financeSubject|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext/ },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? apiNames
                  .map((name) => `export const ${name}=(...args)=>globalThis.__subjectApi.${name}(...args)`)
                  .join('\n')
              : args.path.includes('useProjectContext')
                ? 'export const useProjectContext=()=>globalThis.__subjectContext;export const useProjectSwitchGuard=guard=>globalThis.__subjectGuards.push(guard)'
                : args.path === 'vue-i18n'
                  ? 'export const useI18n=()=>({t:key=>key})'
                  : 'export const onlyMessage=(...args)=>globalThis.__subjectMessages.push(args); export const downloadFileByUrl=()=>{}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useSubjectCatalog } = await load('../hooks/finance-subject/useSubjectCatalog.ts')
const { categoryTree, categoryPath } = await load('../hooks/finance-subject/categoryTree.ts')
const { useSubjectForm } = await load('../hooks/finance-subject/useSubjectForm.ts')
const { useSubjectExcel } = await load('../hooks/finance-subject/useSubjectExcel.ts')
const { useSubjectImportHistory } = await load('../hooks/finance-subject/useSubjectImportHistory.ts')
const subject = (id) => ({
  id,
  code: 'IMMUTABLE',
  categoryId: 'category',
  name: id,
  feeType: '1',
  enabled: true,
  autoInvoice: false,
  arrearsConfigId: 'arrears',
  version: 3
})
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function mount(factory, api = {}) {
  globalThis.__subjectApi = Object.fromEntries(apiNames.map((name) => [name, async () => []]))
  Object.assign(
    globalThis.__subjectApi,
    { getSubject: async (id) => subject(id), saveSubject: async (_id, input) => input },
    api
  )
  globalThis.__subjectContext = {
    projectId: ref('a'),
    projects: ref([{ id: 'a', name: 'Project A' }]),
    refresh: async () => {}
  }
  globalThis.__subjectGuards = []
  globalThis.__subjectMessages = []
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
test('arbitrary-depth directory tree and full path distinguish same-named categories', () => {
  const rows = [
    { id: 'r', parentId: '', name: 'Root' },
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `c${index}`,
      parentId: index ? `c${index - 1}` : 'r',
      name: `Child${index}`
    })),
    { id: 'other', parentId: '', name: 'Child7' }
  ]
  let node = categoryTree(rows)[0]
  for (let index = 0; index < 8; index++) {
    node = node.children[0]
    assert.equal(node.value, `c${index}`)
  }
  assert.equal(
    categoryPath(rows, 'c7'),
    ['Root', ...Array.from({ length: 8 }, (_, i) => `Child${i}`)].join(' / ')
  )
  assert.equal(categoryPath(rows, 'other'), 'Child7')
})
test('stale subject detail cannot overwrite a newer selection and closed drawer stays closed', async () => {
  const pending = deferred()
  const { state, unmount } = mount(() => useSubjectCatalog(), {
    getSubject: (id) => (id === 'old' ? pending.promise : Promise.resolve(subject(id)))
  })
  const old = state.select('old')
  await state.select('new')
  pending.resolve(subject('old'))
  await old
  assert.equal(state.detail.value.id, 'new')
  state.close()
  assert.equal(state.open.value, false)
  unmount()
})
test('readonly and failed detail cannot write, successful editing retains version and selected category reaches query', async () => {
  const saves = [],
    requests = []
  const { state, unmount } = mount(() => useSubjectCatalog(), {
    saveSubject: async (...args) => {
      saves.push(args)
    },
    querySubjects: async (...args) => {
      requests.push(args)
      return { success: true }
    }
  })
  await state.select('view')
  await state.save(subject('view'))
  assert.equal(saves.length, 0)
  await state.select('edit', false)
  await state.save(subject('edit'))
  assert.equal(saves.length, 1)
  assert.equal(saves[0][0], 'edit')
  assert.equal(saves[0][1].version, 3)
  state.failed.value = true
  await state.save(subject('bad'))
  assert.equal(saves.length, 1)
  state.selectedCategory.value = 'nested-category'
  await state.request({ terms: [], pageIndex: 2, pageSize: 12 })
  assert.equal(requests[0][1], 'nested-category')
  assert.equal(requests[0][0].pageIndex, 2)
  unmount()
})
test('project context scopes list and relation deletion and clears obsolete detail on switch', async () => {
  const requests = [],
    deletes = []
  const { state, unmount } = mount(() => useSubjectCatalog(true), {
    queryProjectSubjects: async (...args) => {
      requests.push(args)
    },
    deleteProjectSubject: async (...args) => {
      deletes.push(args)
    },
    getProjectSubject: async (projectId, id) => ({
      relation: { id, projectId, version: 2 },
      subject: subject('shared')
    })
  })
  await state.request({ terms: [] })
  assert.equal(requests[0][0], 'a')
  await state.select('relation-a')
  assert.equal(state.detail.value.id, 'shared')
  assert.equal(globalThis.__subjectGuards[0](), false)
  await state.remove({
    relation: { id: 'relation-a', projectId: 'a', version: 2 },
    subject: subject('shared')
  })
  assert.equal(deletes[0][0], 'a')
  assert.equal(deletes[0][1].relation.version, 2)
  globalThis.__subjectContext.projectId.value = 'b'
  await nextTick()
  assert.equal(state.open.value, false)
  await state.request({ terms: [] })
  assert.equal(requests[1][0], 'b')
  unmount()
})
test('new subject form defaults booleans and submits only editable fields, never immutable code/id', async () => {
  const props = reactive({ open: true, selectedCategory: 'child', detail: undefined })
  const inputs = []
  const { state, unmount } = mount(() => useSubjectForm(props, (input) => inputs.push(input)))
  assert.equal(state.model.value.categoryId, 'child')
  assert.equal(state.model.value.enabled, true)
  assert.equal(state.model.value.autoInvoice, false)
  props.detail = subject('editing')
  await nextTick()
  await state.save()
  assert.equal(inputs[0].version, 3)
  assert.equal('code' in inputs[0], false)
  assert.equal('id' in inputs[0], false)
  unmount()
})
test('detail failure reports exactly one toast and list failure is reported only by the table error event', async () => {
  const error = new Error('Source failed')
  const { state, unmount } = mount(() => useSubjectCatalog(), {
    getSubject: async () => {
      throw error
    },
    querySubjects: async () => {
      throw error
    }
  })
  await state.select('unavailable')
  assert.equal(state.failed.value, true)
  assert.equal(globalThis.__subjectMessages.length, 1)
  await assert.rejects(state.request({ terms: [] }), /Source failed/)
  assert.equal(globalThis.__subjectMessages.length, 1)
  state.notify(error)
  assert.equal(globalThis.__subjectMessages.length, 2)
  unmount()
})
test('batch delete submits selected current versions, retains selection on failure and clears it after success', async () => {
  const calls = []
  let reject = true
  const { state, unmount } = mount(() => useSubjectCatalog(), {
    deleteSubjects: async (rows) => {
      calls.push(rows)
      if (reject) throw new Error('Referenced')
    }
  })
  state.selectedRows.value = [subject('a'), subject('b')]
  state.selectedKeys.value = ['a', 'b']
  await state.removeBatch()
  assert.deepEqual(
    calls[0].map((row) => [row.id, row.version]),
    [
      ['a', 3],
      ['b', 3]
    ]
  )
  assert.deepEqual(state.selectedKeys.value, ['a', 'b'])
  assert.equal(globalThis.__subjectMessages.length, 1)
  reject = false
  await state.removeBatch()
  assert.deepEqual(state.selectedKeys.value, [])
  assert.deepEqual(state.selectedRows.value, [])
  unmount()
})
test('import history pages only while open and failed record details use one toast', async () => {
  const props = reactive({ open: false })
  const calls = []
  const record = {
    id: 'batch',
    fileName: 'subjects.xlsx',
    status: 'FAILED',
    totalCount: 2,
    successCount: 0,
    errorMessage: 'Excel row 3 invalid'
  }
  const { state, unmount } = mount(() => useSubjectImportHistory(props), {
    querySubjectImports: async (query) => {
      calls.push(query)
      return { success: true, result: { total: 1, data: [record] } }
    }
  })
  await state.request({ terms: [] })
  assert.equal(calls.length, 0)
  props.open = true
  await nextTick()
  const result = await state.request({ terms: [], pageIndex: 2, pageSize: 12 })
  assert.equal(calls[0].pageIndex, 2)
  assert.equal(calls[0].pageSize, 12)
  assert.equal(result.result.data[0].successCount, 0)
  state.failure(record)
  assert.equal(globalThis.__subjectMessages.length, 1)
  assert.equal(globalThis.__subjectMessages[0][0], 'Excel row 3 invalid')
  unmount()
})

test('category search retains matching ancestors and descendants, resets without changing selection', async () => {
  const { state, unmount } = mount(() => useSubjectCatalog())
  state.categories.value = [
    { id: 'a', parentId: '', name: '园区' },
    { id: 'b', parentId: 'a', name: '物业' },
    { id: 'c', parentId: 'b', name: '住宅物业费' },
    { id: 'd', parentId: 'a', name: '停车费' }
  ]
  state.selectedCategory.value = 'd'
  state.categoryKeyword.value = '住宅'
  assert.deepEqual(
    state.visibleTree.value.map((n) => n.key),
    ['a']
  )
  assert.deepEqual(
    state.visibleTree.value[0].children.map((n) => n.key),
    ['b']
  )
  assert.equal(state.visibleTree.value[0].children[0].children[0].key, 'c')
  state.categoryKeyword.value = '物业'
  assert.equal(state.visibleTree.value[0].children[0].children.length, 1)
  state.categoryKeyword.value = '不存在'
  assert.equal(state.visibleTree.value.length, 0)
  state.categoryKeyword.value = ''
  assert.equal(state.visibleTree.value[0].children.length, 2)
  assert.equal(state.selectedCategory.value, 'd')
  unmount()
})
test('root and child category creation default to sequence 1 while editing preserves sequence and version', async () => {
  const calls = []
  const { state, unmount } = mount(() => useSubjectCatalog(), {
    saveCategory: async (row) => calls.push({ ...row })
  })
  state.editCategory()
  assert.equal(state.categoryModel.value.sortIndex, 1)
  state.categoryModel.value.name = '新目录'
  await state.submitCategory()
  assert.equal(calls[0].sortIndex, 1)
  const row = { id: 'a', parentId: '', name: '目录', sortIndex: 9, version: 3 }
  state.editCategory(row, true)
  assert.equal(state.categoryModel.value.parentId, 'a')
  assert.equal(state.categoryModel.value.sortIndex, 1)
  state.editCategory(row)
  assert.equal(state.categoryModel.value.sortIndex, 9)
  assert.equal(state.categoryModel.value.version, 3)
  unmount()
})
test('subject import selects without submitting and retains the file after failure, succeeds once on retry', async () => {
  let reloads = 0,
    calls = 0,
    fail = true
  const pending = deferred()
  const { state, unmount } = mount(() => useSubjectExcel(() => reloads++), {
    importSubjects: async (file) => {
      calls++
      assert.equal(file.name, '科目.xlsx')
      if (fail) throw new Error('第3行目录不存在')
      return pending.promise
    }
  })
  state.openImport()
  assert.equal(globalThis.__subjectGuards.at(-1)(), false)
  state.chooseFile(new File(['bad'], 'invalid.csv'))
  assert.equal(state.file.value, undefined)
  const file = new File(['data'], '科目.xlsx')
  state.chooseFile(file)
  assert.equal(calls, 0)
  await state.submitImport()
  assert.equal(state.importOpen.value, true)
  assert.equal(state.file.value, file)
  assert.equal(reloads, 0)
  fail = false
  const request = state.submitImport()
  await state.submitImport()
  state.closeImport()
  assert.equal(state.importOpen.value, true)
  assert.equal(calls, 2)
  pending.resolve({ count: 1 })
  await request
  assert.equal(reloads, 1)
  assert.equal(state.importOpen.value, false)
  assert.equal(state.file.value, undefined)
  unmount()
})
