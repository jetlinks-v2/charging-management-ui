import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick, effectScope, ref } from 'vue'
const require = createRequire(import.meta.url)
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
        name: 'finance-boundaries',
        setup(builder) {
          builder.onResolve(
            { filter: /api\/finance|project\/useProjectContext|@jetlinks-web\/utils|vue-i18n/ },
            (args) => ({
              path: args.path,
              namespace: 'mock'
            })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('project/useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__financeContext'
              : args.path.includes('api/')
                ? [
                    'getCompany',
                    'queryCompanies',
                    'saveCompany',
                    'deleteCompany',
                    'getProjectCompany',
                    'createProjectCompany'
                  ]
                    .map((name) => `export const ${name}=(...args)=>globalThis.__financeApi.${name}(...args)`)
                    .join('\n')
                : args.path === 'vue-i18n'
                  ? 'export const useI18n=()=>({t:key=>key})'
                  : 'export const onlyMessage=()=>{}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useCompanyCatalog } = await load('../hooks/finance/useCompanyCatalog.ts')
const { companyInput } = await load('../utils/companyInput.ts')
const { useProjectCompanyEditor } = await load('../hooks/finance/useProjectCompanyEditor.ts')
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}
const detail = (id) => ({ company: { id, version: 2, companyName: id }, banks: [] })
function mount(api = {}) {
  globalThis.__financeApi = {
    getCompany: async (id) => detail(id),
    saveCompany: async (id, input) => detail(id || 'new'),
    deleteCompany: async () => {},
    ...api
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
        state = useCompanyCatalog()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}

test('editing a linked company updates the company ID and never creates another company', async () => {
  const writes = []
  globalThis.__financeContext = { guard: () => () => {} }
  globalThis.__financeApi = {
    getProjectCompany: async () => detail('company-id'),
    saveCompany: async (...args) => {
      writes.push(['update', ...args])
      return detail('company-id')
    },
    createProjectCompany: async (...args) => {
      writes.push(['create', ...args])
      throw new Error('must not create')
    }
  }
  const scope = effectScope()
  const rows = ref([{ relation: { id: 'relation-id' }, company: { id: 'company-id' } }])
  const editor = scope.run(() => useProjectCompanyEditor(ref('project-id'), rows, async () => {}))
  await editor.select('relation-id', false)
  await editor.save({ companyName: 'Updated company', version: 2, banks: [] })
  assert.equal(writes.length, 1)
  assert.equal(writes[0][0], 'update')
  assert.equal(writes[0][1], 'company-id')
  await editor.select('relation-id', false)
  rows.value = []
  await editor.save({ companyName: 'No longer linked', version: 2, banks: [] })
  assert.equal(writes.length, 1)
  assert.equal(editor.open.value, true)
  scope.stop()
})
test('late company details cannot replace a newer selection or reopen a closed drawer', async () => {
  const a = deferred(),
    b = deferred()
  const { state, unmount } = mount({ getCompany: (id) => (id === 'a' ? a.promise : b.promise) })
  const first = state.select('a', false),
    second = state.select('b', true)
  b.resolve(detail('b'))
  await second
  a.resolve(detail('a'))
  await first
  assert.equal(state.detail.value.company.id, 'b')
  assert.equal(state.readOnly.value, true)
  state.close()
  assert.equal(state.open.value, false)
  assert.equal(state.detail.value, undefined)
  unmount()
})
test('view-only mode cannot save; duplicate clicks produce only one write; failures retain input and never close', async () => {
  let writes = 0
  const pending = deferred()
  const { state, unmount } = mount({
    saveCompany: async () => {
      writes++
      return pending.promise
    }
  })
  await state.select('a', true)
  await state.save({ companyName: 'read-only' })
  assert.equal(writes, 0)
  await state.select('a', false)
  const save = state.save({ companyName: 'new' })
  await state.save({ companyName: 'duplicate' })
  assert.equal(writes, 1)
  assert.equal(state.saving.value, true)
  state.close()
  assert.equal(state.open.value, true)
  pending.resolve(detail('a'))
  await save
  assert.equal(state.open.value, false)
  await state.select('a', false)
  globalThis.__financeApi.saveCompany = async () => {
    throw new Error('Conflict')
  }
  await state.save({ companyName: 'preserved' })
  assert.equal(state.open.value, true)
  assert.equal(state.detail.value.company.id, 'a')
  assert.equal(state.saving.value, false)
  unmount()
})
test('company input preserves bank identity and old accounting details but excludes untrusted metadata', () => {
  const input = companyInput({
    companyName: 'company',
    taxNumber: 'TAX',
    version: 3,
    banks: [
      {
        id: 'bank',
        bankName: 'bank',
        bankAccount: '123',
        defaultBank: true,
        financingInstitution: 'institution',
        jointLineNumber: 'routing',
        accountName: 'name',
        accountNumber: 'code',
        deleted: true
      }
    ],
    deleted: true,
    projectId: 'forged',
    id: 'forged'
  })
  assert.equal(input.version, 3)
  assert.equal(input.banks[0].id, 'bank')
  assert.equal(input.banks[0].accountName, 'name')
  assert.equal('deleted' in input, false)
  assert.equal('projectId' in input, false)
  assert.equal('deleted' in input.banks[0], false)
})
