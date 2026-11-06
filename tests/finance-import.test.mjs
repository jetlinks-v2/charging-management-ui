import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'
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
        name: 'boundaries',
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /api\/finance(CollectionImport|Receivable)|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext/
            },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? [
                  'collectionImportTemplate',
                  'stageCollectionImport',
                  'editCollectionImportLine',
                  'editHistoricalImportLine',
                  'queryHistoricalImports',
                  'queryHistoricalImportLines',
                  'decideHistoricalImports',
                  'decideHistoricalImportLines'
                ]
                  .map((name) => `export const ${name}=(...args)=>globalThis.__imports.api.${name}(...args)`)
                  .join('\n')
              : args.path.includes('useProjectContext')
              ? 'export const useProjectSwitchGuard=g=>globalThis.__imports.guards.push(g)'
              : args.path === 'vue-i18n'
              ? 'export const useI18n=()=>({t:(key,params)=>params?.row ? key+params.row : key})'
              : 'export const onlyMessage=(...args)=>globalThis.__imports.messages.push(args);export const downloadFileByUrl=()=>{}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useCollectionImport } = await load('../hooks/finance-import/useCollectionImport.ts')
const { useImportLineEditor } = await load('../hooks/finance-import/useImportLineEditor.ts')
const { useHistoricalAudit } = await load('../hooks/finance-receivable/useHistoricalAudit.ts')
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { resolve, promise }
}
function mount(factory, api = {}) {
  globalThis.__imports = { api, messages: [], guards: [] }
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
test('四类收款上传只暂存，整批失败保留文件弹窗并提示服务器的具体行错误', async () => {
  for (const kind of ['RECEIVED', 'ADVANCE', 'DEPOSIT', 'TEMPORARY']) {
    let fails = true
    const calls = []
    const props = reactive({ projectId: 'p', projectName: 'P', kind })
    const { state, unmount } = mount(() => useCollectionImport(props), {
      stageCollectionImport: async (...args) => {
        calls.push(args)
        return fails
          ? { status: 'FAILED', errorMessage: '第503行 收款金额错误' }
          : { status: 'PENDING', totalCount: 502 }
      }
    })
    state.open.value = true
    assert.equal(globalThis.__imports.guards.at(-1)(), false)
    const file = new File(['xlsx'], 'import.xlsx')
    await state.upload(file)
    assert.equal(state.open.value, true)
    assert.equal(state.historyOpen.value, false)
    assert.deepEqual(globalThis.__imports.messages.at(-1), ['第503行 收款金额错误', 'error'])
    fails = false
    await state.upload(file)
    assert.deepEqual(calls.at(-1), ['p', kind, file])
    assert.equal(state.open.value, false)
    assert.equal(state.historyOpen.value, true)
    assert.equal(state.readonly.value, true)
    assert.equal(state.status.value, 'PENDING')
    unmount()
  }
})
test('收款上传阻止重复请求，切换项目后的迟到结果不能污染新项目', async () => {
  const late = deferred()
  let count = 0
  const props = reactive({ projectId: 'old', projectName: 'P', kind: 'RECEIVED' })
  const { state, unmount } = mount(() => useCollectionImport(props), {
    stageCollectionImport: async () => {
      count++
      return late.promise
    }
  })
  state.open.value = true
  const pending = state.upload(new File(['xlsx'], 'data.xlsx'))
  await state.upload(new File(['xlsx'], 'data.xlsx'))
  assert.equal(count, 1)
  props.projectId = 'new'
  await nextTick()
  late.resolve({ status: 'PENDING', totalCount: 1 })
  await pending
  assert.equal(state.historyOpen.value, false)
  assert.equal(globalThis.__imports.messages.length, 0)
  assert.equal(state.busy.value, false)
  unmount()
})
test('待审核行改名清除旧关联标识并携带双版本，服务端失败保留编辑内容', async () => {
  const calls = []
  let fails = true,
    saved
  const props = {
    projectId: 'p',
    kind: 'TEMPORARY',
    record: { id: 'batch', version: 8 },
    line: {
      id: 'line',
      version: 5,
      lineNumber: 3,
      payload: {
        externalNo: 'old-ref',
        fullName: 'old-house',
        customerName: 'old-owner',
        subjectName: 'old-subject',
        standardName: 'old-standard',
        companyName: 'old-company',
        methodText: 'old-method',
        bankName: 'old-bank',
        spaceId: 'old-space',
        relationshipId: 'old-relationship',
        subjectId: 'old-subject-id',
        standardId: 'old-standard-id',
        companyId: 'old-company-id',
        method: 'old-method-id',
        recordedId: 'old-bank-id',
        amount: '12.34'
      }
    }
  }
  const { state, unmount } = mount(() => useImportLineEditor(props, (r) => (saved = r)), {
    editCollectionImportLine: async (...args) => {
      calls.push(args)
      if (fails) throw Error('第3行 房屋名称不唯一')
      return { record: { id: 'batch', version: 9 }, line: { id: 'line', version: 6 } }
    }
  })
  state.form.value = { validate: async () => {} }
  Object.assign(state.model, {
    fullName: 'new-house',
    customerName: 'new-owner',
    subjectName: 'new-subject',
    standardName: 'new-standard',
    companyName: 'new-company',
    methodText: 'new-method',
    bankName: 'new-bank'
  })
  await state.submit()
  assert.equal(saved, undefined)
  assert.equal(state.model.fullName, 'new-house')
  assert.equal(globalThis.__imports.messages.at(-1)[0], '第3行 房屋名称不唯一')
  const input = calls.at(-1)[4]
  for (const key of ['spaceId', 'relationshipId', 'subjectId', 'standardId', 'companyId', 'method', 'recordedId'])
    assert.equal(key in input, false, key)
  assert.equal(input.externalNo, 'old-ref')
  assert.equal(input.amount, '12.34')
  assert.equal(calls.at(-1)[2].version, 8)
  assert.equal(calls.at(-1)[3].version, 5)
  fails = false
  await state.submit()
  assert.equal(saved.record.version, 9)
  unmount()
})
test('只读记录拒绝审批与编辑，审批适配器限制批次数并传递当前版本', async () => {
  const props = reactive({ open: true, projectId: 'p', initialStatus: 'ALL', readonly: true }),
    calls = []
  const adapter = {
    query: async (...args) => {
      calls.push(['query', ...args])
      return { success: true, result: { data: [], total: 0 } }
    },
    lines: async () => ({ success: true, result: { data: [], total: 0 } }),
    decide: async (...args) => {
      calls.push(['decide', ...args])
      return [{ id: 'b', version: 2, status: 'APPROVED' }]
    },
    decideLines: async () => {},
    maxBatches: 20
  }
  const { state, unmount } = mount(() => useHistoricalAudit(props, () => {}, adapter))
  const record = { id: 'b', version: 1, status: 'PENDING' },
    line = { id: 'l', version: 3, status: 'PENDING' }
  state.showLines(record)
  state.editLine(line)
  state.start('approve', [record])
  assert.equal(state.editing.value, undefined)
  assert.equal(state.decision.value, undefined)
  props.readonly = false
  state.start(
    'approve',
    Array.from({ length: 21 }, (_, i) => ({ ...record, id: String(i) }))
  )
  assert.equal(state.decision.value, undefined)
  state.searchField.value = 'id'
  state.keyword.value = 'batch'
  state.searchRecords()
  await state.request({ pageIndex: 2, pageSize: 12 })
  assert.deepEqual(calls[0][2].terms, [{ column: 'id', termType: 'like', value: '%batch%' }])
  state.start('approve', [record])
  state.reason.value = 'checked'
  await state.submit()
  assert.equal(calls.at(-1)[0], 'decide')
  assert.equal(calls.at(-1)[3][0].version, 1)
  unmount()
})
async function loadCollectionApi() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../api/financeCollectionImport.ts', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'http',
        setup(builder) {
          builder.onResolve({ filter: /^@jetlinks-web\/core$/ }, (args) => ({ path: args.path, namespace: 'http' }))
          builder.onLoad({ filter: /.*/, namespace: 'http' }, () => ({
            contents: 'export const request=globalThis.__importHttp'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
test('收款API使用项目隔离路径和批次/行双版本，单行/批次均不提交表格附加属性', async () => {
  const calls = []
  globalThis.__importHttp = {
    post: async (...args) => {
      calls.push(['post', ...args])
      return { success: true, result: [] }
    },
    put: async (...args) => {
      calls.push(['put', ...args])
      return {
        success: true,
        result: {
          record: { id: 'b', version: 3 },
          line: { id: 'l', version: 5, lineNumber: 2, status: 'PENDING', payload: { amount: '900719925474099.91' } }
        }
      }
    }
  }
  const api = await loadCollectionApi()
  const record = { id: 'batch/a', version: 2, scopedSlots: true },
    line = { id: 'line/a', version: 4, columns: {} }
  await api.decideCollectionImports('p/a', 'RECEIVED', 'approve', [record], 'checked')
  assert.equal(calls.at(-1)[1], '/property/finance/projects/p%2Fa/collection-imports/RECEIVED/_approve')
  assert.deepEqual(calls.at(-1)[2], { records: [{ id: 'batch/a', version: 2 }], reason: 'checked' })
  await api.decideCollectionImportLines('p/a', 'DEPOSIT', record, 'reject', [line], 'wrong')
  assert.deepEqual(calls.at(-1)[2], { version: 2, items: [{ id: 'line/a', version: 4 }], reason: 'wrong' })
  const result = await api.editCollectionImportLine('p/a', 'TEMPORARY', record, line, { amount: '900719925474099.91' })
  assert.deepEqual(calls.at(-1)[2], { version: 2, lineVersion: 4, payload: { amount: '900719925474099.91' } })
  assert.equal(result.line.receivable.actualReceivableAmount, '900719925474099.91')
  assert.equal(result.record.version, 3)
})
test('押金无收费标准仍可保存，可选空金额和标准省略；日期必须成对，数量按服务规则限制', async () => {
  const calls = []
  const props = {
    projectId: 'p',
    kind: 'DEPOSIT',
    record: { id: 'b', version: 1 },
    line: {
      id: 'l',
      version: 1,
      lineNumber: 2,
      payload: {
        externalNo: 'ref',
        fullName: 'house',
        customerName: 'owner',
        subjectName: 'subject',
        companyName: 'company',
        methodText: '现金',
        paidAt: '2024-01-01T10:00:00',
        payerName: 'payer',
        amount: '1.00'
      }
    }
  }
  const { state, unmount } = mount(() => useImportLineEditor(props, () => {}), {
    editCollectionImportLine: async (...args) => {
      calls.push(args)
      return { record: props.record, line: props.line }
    }
  })
  state.form.value = { validate: async () => {} }
  assert.equal(
    state.fields.value.some((field) => field.key === 'receivableId'),
    false
  )
  assert.equal(state.rules(state.fields.value.find((field) => field.key === 'standardName'))[0].required, false)
  assert.equal(state.rules(state.fields.value.find((field) => field.key === 'quantity'))[0].required, false)
  state.model.startDate = '2024-01-01'
  await state.submit()
  assert.equal(calls.length, 0)
  state.model.startDate = ''
  state.model.quantity = '0'
  await state.submit()
  assert.equal(calls.length, 0)
  state.model.quantity = '123456789.1234'
  await state.submit()
  assert.equal(calls.length, 0)
  state.model.quantity = ''
  await state.submit()
  assert.equal(calls.length, 1)
  assert.equal('standardName' in calls[0][4], false)
  assert.equal('quantity' in calls[0][4], false)
  assert.equal('startDate' in calls[0][4], false)
  unmount()
})
