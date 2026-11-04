import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, computed, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const names = ['getReceivable', 'queryReceivables', 'changeReceivable', 'exportReceivables', 'queryReceivableLogs']
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
                /api\/financeReceivable|@jetlinks-web\/utils|vue-i18n|project\/useProjectContext|archive\/useArchiveScope/
            },
            (args) => ({ path: args.path, namespace: 'mock' })
          )
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents: args.path.includes('api/')
              ? names.map((n) => `export const ${n}=(...a)=>globalThis.__receivableApi.${n}(...a)`).join('\n')
              : args.path.includes('useArchiveScope')
                ? 'export const useArchiveScope=()=>globalThis.__receivableScope;export const flattenSpaces=nodes=>nodes.flatMap(n=>[n,...flattenSpaces(n.children||[])])'
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
  const { state, unmount } = mount(undefined, { queryReceivables: async (...args) => calls.push(args) })
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
  assert.equal(globalThis.__receivableGuards[0](), false)
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
