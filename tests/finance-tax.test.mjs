import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { effectScope, reactive, ref, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = [
  'getTaxItem',
  'queryTaxItems',
  'saveTaxItem',
  'setTaxItemState',
  'deleteTaxItems',
  'getTaxTemplate',
  'importTaxItems',
  'queryTaxImports',
  'queryTaxLogs',
  'getProjectCompanies'
]
async function load(entry) {
  const built = await build({
    entryPoints: [fileURLToPath(new URL(entry, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: [
      {
        name: 'tax-test-dependencies',
        setup(builder) {
          builder.onResolve({ filter: /api\/finance|project\/useProjectContext|@jetlinks-web|vue-i18n/ }, (args) => ({
            path: args.path,
            namespace: 'mock'
          }))
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('project/useProjectContext')
              ? 'export const useProjectContext = () => globalThis.__taxContext; export const useProjectSwitchGuard = fn => { globalThis.__taxGuard = fn }'
              : args.path === 'vue-i18n'
                ? 'export const useI18n = () => ({ t: (key, params) => key + (params ? JSON.stringify(params) : "") })'
                : args.path.includes('api/finance')
                  ? apiNames
                      .map((name) => `export const ${name} = (...args) => globalThis.__taxApi.${name}(...args)`)
                      .join('\n')
                  : 'export const onlyMessage = (message,type) => globalThis.__taxMessages.push({message,type}); export const downloadFileByUrl = () => {}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const catalogModule = await load('../hooks/finance-tax/useTaxCatalog.ts')
const formModule = await load('../hooks/finance-tax/useTaxForm.ts')
const historyModule = await load('../hooks/finance-tax/useTaxHistory.ts')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function flush() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
}
function setup(api = {}) {
  globalThis.__taxContext = { projectId: ref('project-a'), refresh: async () => {} }
  globalThis.__taxMessages = []
  globalThis.__taxApi = { getProjectCompanies: async () => [], ...api }
  const scope = effectScope()
  const catalog = scope.run(catalogModule.useTaxCatalog)
  return { scope, catalog }
}
test('closing a detail ignores its late response', async () => {
  const pending = deferred()
  const { scope, catalog } = setup({ getTaxItem: () => pending.promise })
  const selecting = catalog.select('tax-a')
  catalog.close()
  pending.resolve({ id: 'tax-a', goodsName: 'Old' })
  await selecting
  assert.equal(catalog.open.value, false)
  assert.equal(catalog.detail.value, undefined)
  scope.stop()
})
test('switching project drops old companies, selection and company filter', async () => {
  const pending = deferred()
  const { scope, catalog } = setup({
    getProjectCompanies: (project) =>
      project === 'project-a'
        ? pending.promise
        : Promise.resolve([{ company: { id: 'new', companyName: 'B', taxNumber: '2' } }])
  })
  catalog.companyId.value = 'old'
  catalog.selected.value = [{ id: 'old' }]
  globalThis.__taxContext.projectId.value = 'project-b'
  await flush()
  pending.resolve([{ company: { id: 'old', companyName: 'A', taxNumber: '1' } }])
  await flush()
  assert.equal(catalog.companyId.value, undefined)
  assert.deepEqual(catalog.selected.value, [])
  assert.equal(catalog.companyOptions.value[0].value, 'new')
  scope.stop()
})
test('failed save keeps editor open and uses one error toast', async () => {
  const { scope, catalog } = setup({
    saveTaxItem: async () => {
      throw new Error('Duplicate tax item')
    }
  })
  await catalog.select(undefined, false)
  await catalog.save({ companyId: 'company', goodsName: 'Tax A' })
  assert.equal(catalog.open.value, true)
  assert.equal(catalog.busy.value, false)
  assert.equal(globalThis.__taxMessages.length, 1)
  assert.equal(globalThis.__taxMessages[0].message, 'Duplicate tax item')
  scope.stop()
})
test('read-only details never submit writes and writes prevent project switching', async () => {
  let calls = 0
  const pending = deferred()
  const { scope, catalog } = setup({
    getTaxItem: async () => ({ id: 'tax' }),
    saveTaxItem: () => {
      calls++
      return pending.promise
    }
  })
  await catalog.select('tax')
  await catalog.save({ goodsName: 'Blocked' })
  assert.equal(calls, 0)
  await catalog.select(undefined, false)
  const saving = catalog.save({ goodsName: 'Saved' })
  assert.equal(globalThis.__taxGuard(), false)
  pending.resolve({})
  await saving
  assert.equal(globalThis.__taxGuard(), true)
  scope.stop()
})
test('upload requires one company and leaves parsing to backend', async () => {
  const { scope, catalog } = setup()
  assert.equal(await catalog.upload({ name: 'tax.xlsx', size: 12 }), false)
  assert.match(globalThis.__taxMessages[0].message, /chooseCompany/)
  scope.stop()
})
test('form converts percent to decimal and submits only writable fields', async () => {
  let output
  const scope = effectScope()
  const props = reactive({
    open: true,
    companyId: 'company',
    detail: {
      id: 'tax',
      companyId: 'company',
      version: 2,
      goodsName: 'Tax',
      goodsCode: '301',
      classificationName: 'Service',
      taxRate: 0.06,
      includingTaxFlag: 1,
      favouredPolicyFlag: 0,
      enabled: true,
      goodsId: 'remote'
    }
  })
  const form = scope.run(() => formModule.useTaxForm(props, (input) => (output = input)))
  assert.equal(form.ratePercent.value, 6)
  form.ratePercent.value = 9
  form.price.value = '1234567890123.1234567890'
  await form.submit()
  assert.equal(output.taxRate, 0.09)
  assert.equal(output.price, '1234567890123.1234567890')
  assert.equal(output.version, 2)
  assert.equal('goodsId' in output, false)
  assert.equal('enabled' in output, false)
  scope.stop()
})
test('form resets company and values for a new entry', async () => {
  const scope = effectScope()
  const props = reactive({ open: true, companyId: 'a', detail: undefined })
  const form = scope.run(() => formModule.useTaxForm(props, () => {}))
  form.model.goodsName = 'Old'
  props.open = false
  await nextTick()
  props.companyId = 'b'
  props.open = true
  await nextTick()
  assert.equal(form.model.goodsName, '')
  assert.equal(form.model.companyId, 'b')
  scope.stop()
})
test('audit history describes business differences without raw JSON', () => {
  const scope = effectScope()
  const history = scope.run(() => historyModule.useTaxHistory({ open: true, projectId: 'a', taxId: 'tax' }))
  const changes = history.changes({
    operation: 'UPDATE',
    beforeSnapshot: '{"goodsName":"A","version":0}',
    afterSnapshot: '{"goodsName":"B","version":1}'
  })
  assert.match(changes, /goodsName: A → B/)
  assert.doesNotMatch(changes, /version|\{/)
  scope.stop()
})
