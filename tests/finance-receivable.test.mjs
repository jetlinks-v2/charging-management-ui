import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, computed, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const names = [
  'getReceivable',
  'queryReceivables',
  'changeReceivable',
  'exportReceivables',
  'queryReceivableLogs',
  'previewAdjustment',
  'submitAdjustment',
  'getSplitOptions',
  'previewSplit',
  'submitSplit',
  'historicalTemplate',
  'importHistorical',
  'queryHistoricalImports',
  'deleteReceivableBatch',
  'previewPaymentNotice'
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
                /api\/financeReceivable|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext|finance-setting\/useFinanceSpaceScope/
            },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? names.map((n) => `export const ${n}=(...a)=>globalThis.__receivableApi.${n}(...a)`).join('\n')
              : args.path.includes('useFinanceSpaceScope')
                ? 'export const useFinanceSpaceScope=()=>globalThis.__receivableScope;export const flattenSpaces=nodes=>nodes.flatMap(n=>[n,...flattenSpaces(n.children||[])])'
                : args.path.includes('useProjectContext')
                  ? 'export const useProjectSwitchGuard=g=>globalThis.__receivableGuards.push(g)'
                  : args.path === 'vue-i18n'
                    ? 'export const useI18n=()=>({t:key=>key})'
                    : 'export const onlyMessage=(...a)=>globalThis.__receivableMessages.push(a);export const downloadFileByUrl=()=>{}'
          }))
        }
      }
    ]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const { useReceivableWorkspace } = await load('../hooks/finance-receivable/useReceivableWorkspace.ts')
const { useReceivableLogs } = await load('../hooks/finance-receivable/useReceivableLogs.ts')
const { useReceivableAdjustment } = await load('../hooks/finance-receivable/useReceivableAdjustment.ts')
const row = (id) => ({ id, version: 3, allowedOperations: ['FREEZE'] })
function mount(factory = useReceivableWorkspace, api = {}) {
  globalThis.__receivableApi = { getReceivable: async (_p, id) => row(id), ...api }
  globalThis.__receivableMessages = []
  globalThis.__receivableGuards = []
  const selectedId = ref(),
    tree = ref([{ id: 'building', children: [{ id: 'room' }] }])
  globalThis.__receivableScope = {
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
const deferred = () => {
  let resolve
  const promise = new Promise((r) => (resolve = r))
  return { resolve, promise }
}

test('空间选择持续选中，状态条件叠加，查询保留项目及分页', async () => {
  const calls = []
  const { state, unmount } = mount(undefined, {
    queryReceivables: async (...args) => {
      calls.push(args)
      return { success: true, result: { data: [], total: 0 } }
    }
  })
  state.archive.selectedId.value = 'building'
  state.status.value = 'FROZEN'
  assert.deepEqual(state.params.value.terms, [
    { column: 'spaceId', termType: 'in', value: ['building', 'room'] },
    { column: 'frozen', termType: 'eq', value: true }
  ])
  await state.request({ ...state.params.value, pageIndex: 2, pageSize: 12 })
  assert.equal(calls[0][0], 'a')
  assert.equal(calls[0][1].pageIndex, 2)
  assert.equal(state.archive.selectedId.value, 'building')
  unmount()
})

test('详情和项目切换隔离迟到响应，打开时阻止切项目', async () => {
  const pending = deferred()
  const { state, unmount } = mount(undefined, {
    getReceivable: async (_p, id) => (id === 'old' ? pending.promise : row(id))
  })
  const old = state.select(row('old'))
  await state.select(row('new'))
  assert.equal(
    globalThis.__receivableGuards.every((guard) => guard()),
    false
  )
  pending.resolve(row('old'))
  await old
  assert.equal(state.detail.value.id, 'new')
  state.archive.projectId.value = 'b'
  await nextTick()
  assert.equal(state.open.value, false)
  assert.equal(state.detail.value, undefined)
  unmount()
})

test('冻结失败保留原因对话框且不刷新；成功携带原版本后刷新', async () => {
  const calls = []
  let attempts = 0,
    reloads = 0
  const { state, unmount } = mount(undefined, {
    changeReceivable: async (...args) => {
      calls.push(args)
      if (!attempts++) throw new Error('版本已改变')
    }
  })
  state.table.value = { reload: () => reloads++ }
  state.actionTarget.value = { row: row('bill'), action: 'FREEZE' }
  await state.change('核对收费')
  assert.ok(state.actionTarget.value)
  assert.equal(reloads, 0)
  assert.equal(globalThis.__receivableMessages.at(-1)[1], 'error')
  await state.change('核对收费')
  assert.equal(state.actionTarget.value, undefined)
  assert.equal(reloads, 1)
  assert.deepEqual(calls[1], ['a', row('bill'), 'FREEZE', '核对收费'])
  unmount()
})

test('日志分页传后端，切账单丢弃旧日志，卸载后不回写', async () => {
  const pending = deferred(),
    calls = []
  const props = reactive({ projectId: 'a', detail: row('old') })
  const { state, unmount } = mount(() => useReceivableLogs(props), {
    queryReceivableLogs: async (...args) => {
      calls.push(args)
      return args[1] === 'old' ? pending.promise : { result: { total: 9, data: [{ id: 'new' }] } }
    }
  })
  props.detail = row('new')
  await nextTick()
  await new Promise((resolve) => setImmediate(resolve))
  pending.resolve({ result: { total: 1, data: [{ id: 'old' }] } })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.rows.value[0].id, 'new')
  await state.load(2)
  assert.equal(calls.at(-1)[2].pageIndex, 1)
  assert.equal(state.current.value, 2)
  unmount()
})

test('调整必须预览；变更输入立即失效，迟到预览不能重新解锁提交', async () => {
  const pending = deferred(),
    calls = []
  const props = reactive({
    projectId: 'a',
    detail: {
      ...row('bill'),
      subjectId: 's',
      standardId: 't',
      calcStartDate: '2024-02-10',
      calcEndDate: '2024-02-29',
      snapshot: { values: { BILLING_AREA: '100.25' }, standard: { variablesSnapshot: [] } }
    }
  })
  const { state, unmount } = mount(() => useReceivableAdjustment(props, () => calls.push('done')), {
    previewAdjustment: async (...args) => {
      calls.push(args)
      return pending.promise
    },
    submitAdjustment: async (...args) => calls.push(args)
  })
  state.form.value = { validate: async () => {} }
  state.model.reason = '核对费用'
  state.model.directAmount = '10.00'
  await state.submit()
  assert.equal(calls.length, 0)
  const request = state.calculate()
  await nextTick()
  state.model.directAmount = '20.00'
  pending.resolve({ token: 'old', delta: '10.00' })
  await request
  assert.equal(state.preview.value, undefined)
  assert.equal(calls[0][2].directAmount, '10.00')
  unmount()
})

test('确认提交使用预览的原始字符串、附件及版本；拒绝保留表单并要求重新预览', async () => {
  const calls = []
  let rejected = true,
    done = 0
  const props = reactive({
    projectId: 'a',
    detail: { ...row('bill'), subjectId: 's', standardId: 't', calcStartDate: '2024-02-10', calcEndDate: '2024-02-29' }
  })
  const { state, unmount } = mount(() => useReceivableAdjustment(props, () => done++), {
    previewAdjustment: async () => ({ token: 'confirmed', delta: '90071992547409.91' }),
    submitAdjustment: async (...args) => {
      calls.push(args)
      if (rejected) throw new Error('预览已过期')
    }
  })
  state.form.value = { validate: async () => {} }
  state.model.reason = '核对费用'
  state.model.directAmount = '90071992547409.91'
  state.filesChanged({ fileList: [{ uid: 'u', name: '凭证.pdf', status: 'uploading' }] })
  await state.calculate()
  assert.equal(state.preview.value, undefined)
  state.filesChanged({
    fileList: [{ uid: 'u', name: '凭证.pdf', status: 'done', response: { success: true, result: { id: 'file' } } }]
  })
  await state.calculate()
  assert.ok(state.preview.value)
  await state.submit()
  assert.equal(done, 0)
  assert.equal(state.preview.value, undefined)
  assert.equal(state.model.reason, '核对费用')
  assert.equal(calls[0][2].directAmount, '90071992547409.91')
  assert.deepEqual(calls[0][2].attachmentFileIds, ['file'])
  assert.equal(calls[0][2].version, 3)
  assert.equal(calls[0][3], 'confirmed')
  rejected = false
  await state.calculate()
  await state.submit()
  assert.equal(done, 1)
  unmount()
})

const { useReceivableSplit } = await load('../hooks/finance-receivable/useReceivableSplit.ts')
test('拆分先加载真实客户，预览不可被变更或迟到响应复用，拒绝保留原因', async () => {
  const pending = deferred(),
    calls = []
  const props = reactive({
    projectId: 'a',
    detail: {
      ...row('bill'),
      customerRelationshipId: 'link',
      calcStartDate: '2024-02-10',
      calcEndDate: '2024-02-29',
      accruedAsOfDate: '2024-02-15'
    }
  })
  const { state, unmount } = mount(() => useReceivableSplit(props, () => calls.push('done')), {
    getSplitOptions: async () => [{ relationshipId: 'link', name: '龚超' }],
    previewSplit: async (...a) => {
      calls.push(a)
      return pending.promise
    },
    submitSplit: async (...a) => {
      calls.push(a)
      throw new Error('版本过期')
    }
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.options.value[0].name, '龚超')
  state.form.value = { validate: async () => {} }
  state.model.splitDate = '2024-02-12'
  state.model.reason = '搬迁分账'
  await state.submit()
  assert.equal(calls.length, 0)
  const request = state.calculate()
  await nextTick()
  state.model.scale = 0
  pending.resolve({ token: 'expired', total: '25.51', parts: [] })
  await request
  assert.equal(state.preview.value, undefined)
  await state.calculate()
  await state.submit()
  assert.equal(calls.at(-1)[2].scale, 0)
  assert.equal(calls.at(-1)[2].version, 3)
  assert.equal(state.model.reason, '搬迁分账')
  assert.equal(state.preview.value, undefined)
  assert.equal(calls.includes('done'), false)
  unmount()
})

const { useHistoricalImport } = await load('../hooks/finance-receivable/useHistoricalImport.ts')
test('历史导入失败不刷新账单也不关闭文件选择，成功才刷新并解除忙碌', async () => {
  let reloads = 0,
    attempts = 0
  const props = reactive({ projectId: 'a', projectName: '园区' })
  const { state, unmount } = mount(() => useHistoricalImport(props, () => reloads++), {
    importHistorical: async () =>
      ++attempts === 1 ? { status: 'FAILED', errorMessage: '第3行金额错误' } : { status: 'SUCCESS', successCount: 2 }
  })
  state.open.value = true
  const file = new File(['data'], '历史.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  await state.upload(file)
  assert.equal(reloads, 0)
  assert.equal(state.open.value, true)
  assert.equal(globalThis.__receivableMessages.at(-1)[1], 'error')
  await state.upload(file)
  assert.equal(reloads, 1)
  assert.equal(state.open.value, false)
  assert.equal(state.busy.value, false)
  unmount()
})

test('历史导入锁定项目，切换项目或卸载后丢弃迟到结果，记录请求只取当前项目', async () => {
  const pending = deferred(),
    calls = []
  let saved = 0
  const props = reactive({ projectId: 'a', projectName: '园区' })
  const { state, unmount } = mount(() => useHistoricalImport(props, () => saved++), {
    importHistorical: async () => pending.promise,
    queryHistoricalImports: async (...args) => {
      calls.push(args)
      return { success: true, result: { data: [], total: 0 } }
    }
  })
  state.open.value = true
  assert.equal(globalThis.__receivableGuards.at(-1)(), false)
  const uploading = state.upload(new File(['data'], '历史.xlsx'))
  assert.equal(state.busy.value, true)
  props.projectId = 'b'
  await nextTick()
  pending.resolve({ status: 'SUCCESS', successCount: 1 })
  await uploading
  assert.equal(saved, 0)
  assert.equal(state.busy.value, false)
  state.historyOpen.value = true
  await state.request({ pageIndex: 2, pageSize: 12, terms: [{ column: 'projectId', termType: 'eq', value: 'a' }] })
  assert.equal(calls[0][0], 'b')
  assert.deepEqual(calls[0][1], { terms: [], pageIndex: 2, pageSize: 12 })
  unmount()
})

const { useReceivableBatch } = await load('../hooks/finance-receivable/useReceivableBatch.ts')
test('批量删除失败保留勾选原因，成功才清理；通知迟到不能覆盖新范围', async () => {
  const project = ref('a'),
    params = ref({ spaceId: 'room' }),
    pending = deferred(),
    calls = []
  let succeed = false,
    refreshed = 0
  const { state, unmount } = mount(() => useReceivableBatch(project, params, () => refreshed++), {
    deleteReceivableBatch: async (...a) => {
      calls.push(a)
      if (!succeed) throw Error('已冻结')
    },
    previewPaymentNotice: async () => pending.promise
  })
  state.selected.value = [{ ...row('bill'), allowedOperations: ['DELETE'] }]
  state.startDelete()
  state.reason.value = '误出账'
  await state.remove()
  assert.equal(state.selected.value.length, 1)
  assert.equal(state.reason.value, '误出账')
  assert.equal(state.deleting.value, true)
  assert.equal(refreshed, 0)
  succeed = true
  await state.remove()
  assert.equal(refreshed, 1)
  assert.equal(state.selected.value.length, 0)
  assert.deepEqual(calls[1], ['a', [{ id: 'bill', version: 3 }], '误出账'])
  state.selected.value = [row('bill')]
  const request = state.preview()
  params.value = { spaceId: 'other' }
  await nextTick()
  pending.resolve({ total: '100.00' })
  await request
  assert.equal(state.notice.value, undefined)
  assert.equal(state.selected.value.length, 0)
  unmount()
})

const { sumMoney } = await load('../utils/receivableTotals.ts')
test('本页合计以分保留大额尾数，不能将非法金额静默算为零', () => {
  assert.equal(sumMoney(['900719925474099.91', '0.09']), '900719925474100.00')
  assert.equal(sumMoney(['100.00', '-100.01']), '-0.01')
  assert.equal(sumMoney([]), '0.00')
  assert.throws(() => sumMoney(['not money']))
})

const { receivableDateValue, receivableFields } = await load('../utils/receivableFields.ts')
test('业务日期筛选使用本地日历日期，区间和清空不以时间戳查询字符串列', () => {
  const from = new Date(2024, 1, 29, 0, 0).getTime()
  const to = new Date(2024, 2, 1, 23, 59).getTime()
  assert.equal(receivableDateValue(from), '2024-02-29')
  assert.deepEqual(receivableDateValue([from, to]), ['2024-02-29', '2024-03-01'])
  assert.equal(receivableDateValue(undefined), undefined)
  assert.throws(() => receivableDateValue('invalid'))
  const fields = receivableFields((key) => key)
  assert.ok(fields.some((field) => field.dataIndex === 'contractCode'))
  assert.equal(fields.find((field) => field.dataIndex === 'dueDate').search.handleValue(to), '2024-03-01')
})

const { normalizeReceivableColumns } = await load('../utils/receivableColumns.ts')
test('列偏好保留已知列、限制宽度，并保证房屋身份和操作列可见', () => {
  const options = [
    { key: 'house', width: 200, locked: true },
    { key: 'amount', width: 130 },
    { key: 'remark', width: 180, hidden: true }
  ]
  const saved = normalizeReceivableColumns(options, {
    house: { hidden: true, width: 9999 },
    amount: { hidden: true, width: 2 },
    unknown: { width: 100 }
  })
  assert.deepEqual(saved.house, { hidden: false, width: 600 })
  assert.deepEqual(saved.amount, { hidden: true, width: 90 })
  assert.equal(saved.unknown, undefined)
  assert.deepEqual(normalizeReceivableColumns(options, null).remark, { hidden: true, width: 180 })
})
