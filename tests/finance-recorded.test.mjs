import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, reactive, nextTick } from 'vue'
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
        name: 'recorded-boundaries',
        setup(builder) {
          builder.onResolve({ filter: /api\/|@jetlinks-web\/utils|vue-i18n|useProjectContext$/ }, (args) => ({
            path: args.path,
            namespace: 'fixture'
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            contents: args.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>globalThis.__recordedContext; export const useProjectSwitchGuard=fn=>{globalThis.__recordedGuard=fn}'
              : args.path.includes('api/')
                ? [
                    'getRecordedOptions',
                    'getRecorded',
                    'queryRecorded',
                    'createRecorded',
                    'updateRecorded',
                    'deleteRecorded',
                    'previewRecordedFee'
                  ]
                    .map((name) => `export const ${name}=(...args)=>globalThis.__recordedApi.${name}(...args)`)
                    .join('\n')
                : args.path === 'vue-i18n'
                  ? 'export const useI18n=()=>({t:(key,args)=>JSON.stringify({key,args})})'
                  : 'export const onlyMessage=(...args)=>globalThis.__recordedMessages.push(args)'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useRecorded } = await load('../hooks/finance-recorded/useRecorded.ts')
const { useRecordedForm } = await load('../hooks/finance-recorded/useRecordedForm.ts')
const { emptyRecorded, recordedInput, setFeeType, appendTier, normalizeRecorded } = await load(
  '../hooks/finance-recorded/model.ts'
)
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
const detail = (id) => ({
  record: {
    id,
    version: 3,
    companyId: 'company-a',
    bankId: 'bank-a',
    sourceCharge: '1',
    patternPayment: '2',
    serviceChargeType: 1,
    minimumFee: 0.2,
    maximumFee: 5,
    facilitatorId: 'historical-provider'
  },
  tiers: [{ minimumAmount: 0, maximumAmount: null, procedureRate: 1 }]
})
const optionSet = () => ({
  sources: [{ value: '1', text: 'PC' }],
  payments: [{ value: '1', text: 'Cash' }],
  companies: [
    { id: 'company-a', companyName: 'Company A', banks: [{ id: 'bank-a', bankName: 'Bank A', bankAccount: '1' }] },
    { id: 'company-b', companyName: 'Company B', banks: [{ id: 'bank-b', bankName: 'Bank B', bankAccount: '2' }] }
  ]
})
function mount(api = {}) {
  globalThis.__recordedMessages = []
  globalThis.__recordedContext = { projectId: ref('project-a'), refresh: async () => {} }
  globalThis.__recordedApi = {
    getRecordedOptions: async () => optionSet(),
    getRecorded: async (_, id) => detail(id),
    createRecorded: async () => ({ created: [{}], skipped: [] }),
    updateRecorded: async () => detail('updated'),
    deleteRecorded: async () => {},
    queryRecorded: async (projectId) => ({ success: true, result: { data: [], projectId } }),
    previewRecordedFee: async () => 1.25,
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
        state = useRecorded()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
test('historical details remain read-only and late responses cannot replace the current selection', async () => {
  const a = deferred(),
    b = deferred()
  let writes = 0
  const { state, unmount } = mount({
    getRecorded: (_, id) => (id === 'a' ? a.promise : b.promise),
    updateRecorded: async () => {
      writes++
    }
  })
  const first = state.select('a'),
    second = state.select('b')
  b.resolve(detail('b'))
  await second
  a.resolve(detail('a'))
  await first
  assert.equal(state.detail.value.record.id, 'b')
  assert.equal(state.readOnly.value, true)
  await state.save(emptyRecorded())
  assert.equal(writes, 0)
  const input = recordedInput(state.detail.value)
  assert.equal(input.facilitatorId, 'historical-provider')
  assert.equal(input.version, 3)
  state.close()
  assert.equal(state.open.value, false)
  assert.equal(state.detail.value, undefined)
  unmount()
})
test('batch save blocks duplicate clicks and clearly reports duplicate combinations instead of silent success', async () => {
  const pending = deferred()
  let writes = 0
  const { state, unmount } = mount({
    createRecorded: async () => {
      writes++
      return pending.promise
    }
  })
  await state.select(undefined, false)
  assert.deepEqual(
    state.sources.value.map((row) => row.value),
    ['1']
  )
  assert.deepEqual(
    state.payments.value.map((row) => row.value),
    ['1']
  )
  assert.equal(globalThis.__recordedGuard(), false)
  const saving = state.save(emptyRecorded())
  await state.save(emptyRecorded())
  assert.equal(writes, 1)
  state.close()
  assert.equal(state.open.value, true)
  pending.resolve({ created: [{}, {}], skipped: [{ sourceCharge: '1', patternPayment: '2' }] })
  await saving
  const message = globalThis.__recordedMessages.at(-1)
  assert.deepEqual(JSON.parse(message[0]), { key: 'Recorded.created', args: { count: 2, skipped: 1 } })
  assert.equal(message[1], 'warning')
  assert.equal(state.open.value, false)
  unmount()
})
test('failed option or detail reads never fabricate choices, save, or show inline error panels', async () => {
  let writes = 0
  const { state, unmount } = mount({
    getRecordedOptions: async () => {
      throw Error('Dictionary unavailable')
    },
    createRecorded: async () => {
      writes++
    }
  })
  await state.select(undefined, false)
  await state.save(emptyRecorded())
  assert.equal(state.optionsReady.value, false)
  assert.equal(writes, 0)
  assert.equal(state.sources.value.length, 0)
  globalThis.__recordedApi.getRecorded = async () => {
    throw Error('Not permitted')
  }
  await state.select('forbidden')
  assert.equal(state.open.value, false)
  assert.equal(state.failed.value, true)
  assert.equal(globalThis.__recordedMessages.at(-1)[1], 'error')
  unmount()
})
test('one project options request supplies dictionaries and company banks without separate maintenance APIs', async () => {
  const projects = []
  const { state, unmount } = mount({
    getRecordedOptions: async (project) => {
      projects.push(project)
      return optionSet()
    }
  })
  await state.loadOptions()
  assert.deepEqual(projects, ['project-a'])
  await state.loadBanks('company-a')
  assert.deepEqual(
    state.banks.value.map((row) => row.id),
    ['bank-a']
  )
  await state.loadBanks('company-b')
  assert.deepEqual(
    state.banks.value.map((row) => row.id),
    ['bank-b']
  )
  await state.loadBanks('forged-company')
  assert.deepEqual(state.banks.value, [])
  assert.deepEqual(projects, ['project-a'])
  unmount()
})
test('late project options cannot replace a newer authorized selection', async () => {
  const a = deferred(),
    b = deferred()
  let calls = 0
  const { state, unmount } = mount({ getRecordedOptions: () => (++calls === 1 ? a.promise : b.promise) })
  const first = state.loadOptions(),
    second = state.loadOptions()
  const newer = optionSet()
  newer.companies = [newer.companies[1]]
  b.resolve(newer)
  await second
  a.resolve(optionSet())
  await first
  await state.loadBanks('company-b')
  assert.deepEqual(
    state.companies.value.map((row) => row.id),
    ['company-b']
  )
  assert.deepEqual(
    state.banks.value.map((row) => row.id),
    ['bank-b']
  )
  unmount()
})
test('fee mode transitions preserve full tier and bound data while preventing stale cross-mode payloads', () => {
  const model = emptyRecorded()
  setFeeType(model, 1)
  model.minimumFee = 0.1
  model.maximumFee = 10
  model.tiers[0].maximumAmount = 100
  appendTier(model)
  model.tiers[1].procedureRate = 2
  const normalized = normalizeRecorded(model)
  assert.deepEqual(normalized.tiers, [
    { minimumAmount: 0, maximumAmount: 100, procedureRate: 0 },
    { minimumAmount: 100, maximumAmount: null, procedureRate: 2 }
  ])
  assert.equal(normalized.minimumFee, 0.1)
  assert.equal(normalized.maximumFee, 10)
  setFeeType(model, 2)
  assert.equal(model.tiers.length, 0)
  assert.equal(model.minimumFee, null)
  assert.equal(model.fixedAmount, 0)
  setFeeType(model, null)
  assert.deepEqual(model, emptyRecorded())
})

test('opening a fresh form clears the previous version and service provider, and omitted fee mode stays unconfigured', async () => {
  const props = reactive({ open: true, readOnly: false, detail: detail('historical') })
  let formState
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
        formState = useRecordedForm(
          props,
          async () => undefined,
          () => {}
        )
        return () => h('div')
      }
    })
  )
  app.mount({})
  assert.equal(formState.model.facilitatorId, 'historical-provider')
  assert.equal(formState.model.version, 3)
  props.open = false
  props.detail = undefined
  await nextTick()
  props.open = true
  await nextTick()
  assert.equal(formState.model.facilitatorId, undefined)
  assert.equal(formState.model.version, undefined)
  formState.selection('sourceCharges', '2')
  assert.deepEqual(formState.model.sourceCharges, ['2'])
  formState.selection('patternPayments', ['1', '2'])
  assert.deepEqual(formState.model.patternPayments, ['1', '2'])
  const historical = detail('no-fee')
  delete historical.record.serviceChargeType
  assert.equal(recordedInput(historical).serviceChargeType, null)
  app.unmount()
})
