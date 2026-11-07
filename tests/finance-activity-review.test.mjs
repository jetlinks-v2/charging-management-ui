import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, reactive, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [
    fileURLToPath(new URL('../hooks/finance-activity/useActivityReview.ts', import.meta.url)),
    fileURLToPath(new URL('../hooks/finance-activity/useActivitySpaces.ts', import.meta.url))
  ],
  outdir: 'out',
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
          { filter: /api\/financeActivity|useProjectContext|@jetlinks-web\/utils|vue-i18n/ },
          (args) => ({ path: args.path, namespace: 'mock' })
        )
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeActivity')
            ? ['queryActivities', 'getActivity', 'reviewActivities']
                .map((name) => `export const ${name}=(...args)=>globalThis.__reviewApi.${name}(...args)`)
                .join('\n')
            : args.path.includes('useProjectContext')
            ? 'export const useProjectSwitchGuard=()=>{}'
            : args.path === 'vue-i18n'
            ? 'export const useI18n=()=>({t:key=>key})'
            : 'export const onlyMessage=()=>{}'
        }))
      }
    }
  ]
})
function load(name) {
  const file = compiled.outputFiles.find((f) => f.path.endsWith(name + '.js'))
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', file.text)(require, mod, mod.exports)
  return mod.exports
}
const { useActivitySpaces } = load('useActivitySpaces')
const { useActivityReview } = load('useActivityReview')
const spaces = [
  { id: 'root', name: '园区', fullName: '园区', rootId: 'root', leaf: false },
  { id: 'building', parentId: 'root', name: '1栋', fullName: '园区/1栋', rootId: 'root', leaf: false },
  { id: 'room', parentId: 'building', name: '101', fullName: '园区/1栋/101', rootId: 'root', leaf: true, customerBound: true },
  { id: 'other', parentId: 'root', name: '2栋', fullName: '园区/2栋', rootId: 'root', leaf: true, customerBound: true }
]
test('checking a building selects its leaf rooms and never submits the parent range', () => {
  const source = [
    ...spaces,
    { id: 'room2', parentId: 'building', name: '102', fullName: '园区/1栋/102', rootId: 'root', leaf: true, customerBound: true }
  ]
  const selectedIds = []
  const state = useActivitySpaces({ spaces: source, selectedIds })
  state.check(['building', 'room', 'room2'])
  assert.deepEqual(state.selected.value, ['room', 'room2'])
  state.check(['room2'])
  assert.deepEqual(state.selected.value, ['room2'])
  assert.deepEqual(selectedIds, [])
})

test('legacy parent ranges reopen with all descendant rooms selected without changing the form draft', () => {
  const selectedIds = ['root', 'building', 'room']
  const state = useActivitySpaces({ spaces, selectedIds })
  assert.deepEqual(state.selected.value, ['room', 'other'])
  assert.deepEqual(selectedIds, ['root', 'building', 'room'])
})

test('filtered check and uncheck preserve previously selected hidden rooms', () => {
  const state = useActivitySpaces({ spaces, selectedIds: ['other'] })
  state.keyword.value = '101'
  assert.equal(state.visibleTree.value[0].children[0].children[0].id, 'room')
  state.check(['root', 'building', 'room'])
  assert.deepEqual(state.selected.value, ['other', 'room'])
  state.check([])
  assert.deepEqual(state.selected.value, ['other'])
  state.keyword.value = '不存在'
  assert.equal(state.visibleTree.value.length, 0)
  assert.deepEqual(state.selected.value, ['other'])
})

test('活动可选择非末级客户空间，单独选择下级不会自动增加父级收费空间', () => {
  const source = spaces.map((node) => ({ ...node, customerBound: node.id === 'building' || node.customerBound }))
  const state = useActivitySpaces({ spaces: source, selectedIds: ['building'] })
  assert.deepEqual(state.selected.value, ['building', 'room'])
  state.check({ checked: [] }, { node: { key: 'building' }, checked: true })
  assert.deepEqual(state.selected.value, ['building', 'room'])
  state.check({ checked: [] }, { node: { key: 'building' }, checked: false })
  assert.deepEqual(state.selected.value, [])
  state.check({ checked: ['room'] }, { node: { key: 'room' }, checked: true })
  assert.deepEqual(state.selected.value, ['room'])
  assert.ok(state.checkedKeys.value.halfChecked.includes('building'))
  assert.ok(!state.checkedKeys.value.checked.includes('building'))
})

test('取消活动下级范围同时取消已选客户上级，避免后台仍按上级覆盖下级', () => {
  const source = [
    ...spaces.map((node) => ({ ...node, customerBound: node.id === 'building' || node.customerBound })),
    { id: 'room2', parentId: 'building', name: '102', fullName: '园区/1栋/102', rootId: 'root', customerBound: true }
  ]
  const state = useActivitySpaces({ spaces: source, selectedIds: ['building', 'other'] })
  state.keyword.value = '101'
  state.check({ checked: [] }, { node: { key: 'room' }, checked: false })
  assert.deepEqual(new Set(state.selected.value), new Set(['room2', 'other']))
  state.check({ checked: [] }, { node: { key: 'building' }, checked: true })
  assert.deepEqual(new Set(state.selected.value), new Set(['building', 'room', 'room2', 'other']))
})

function mount(api = {}) {
  globalThis.__reviewApi = { queryActivities: async () => ({ success: true, result: { data: [], total: 0 } }), ...api }
  const props = reactive({ projectId: 'project' })
  const scope = effectScope()
  let saved = 0
  const state = scope.run(() => useActivityReview(props, () => saved++))
  return { state, props, stop: () => scope.stop(), saved: () => saved }
}
const row = (id, state = 'PENDING') => ({ activity: { id, version: 3, reviewState: state } })
test('review queries keep project, search, status and pagination on the server', async () => {
  let call
  const m = mount({
    queryActivities: async (...args) => {
      call = args
      return { success: true }
    }
  })
  m.state.show()
  m.state.status.value = 'REJECTED'
  m.state.search.value = '充值'
  await m.state.request({ pageIndex: 2, pageSize: 12 })
  assert.equal(call[0], 'project')
  assert.equal(call[1].pageIndex, 2)
  assert.deepEqual(call[1].terms, [
    { column: 'reviewState', termType: 'eq', value: 'REJECTED' },
    { column: 'name', termType: 'like', value: '%充值%' }
  ])
  m.stop()
})
test('only pending rows can enter review and failed review preserves the selection for retry', async () => {
  const calls = []
  const m = mount({
    reviewActivities: async (...args) => {
      calls.push(args)
      throw Error('conflict')
    }
  })
  m.state.start('approve', [row('done', 'APPROVED')])
  assert.equal(m.state.decision.value, undefined)
  m.state.start('reject', [row('pending')])
  await m.state.submit()
  assert.equal(calls.length, 0)
  m.state.reason.value = '  修改优惠范围  '
  await m.state.submit()
  assert.equal(calls[0][0], 'project')
  assert.equal(calls[0][3], '修改优惠范围')
  assert.equal(m.state.decision.value, 'reject')
  assert.equal(m.state.targets.value[0].activity.version, 3)
  assert.equal(m.state.busy.value, false)
  assert.equal(m.saved(), 0)
  m.stop()
})
test('successful review refreshes read-only detail and list once', async () => {
  const detail = { activity: { id: 'a', version: 4, reviewState: 'APPROVED' } }
  const m = mount({ reviewActivities: async () => [detail] })
  let reloaded = 0
  m.state.table.value = { reload: () => reloaded++ }
  m.state.detail.value = { activity: { id: 'a', version: 3, reviewState: 'PENDING' } }
  m.state.start('approve', [row('a')])
  m.state.reason.value = '通过'
  await m.state.submit()
  assert.equal(m.state.detail.value.activity.reviewState, 'APPROVED')
  assert.equal(m.state.decision.value, undefined)
  assert.equal(reloaded, 1)
  assert.equal(m.saved(), 1)
  m.stop()
})
test('a late review response cannot modify a different project and duplicate submit is blocked', async () => {
  let resolve,
    calls = 0
  const pending = new Promise((yes) => (resolve = yes))
  const m = mount({
    reviewActivities: () => {
      calls++
      return pending
    }
  })
  m.state.start('approve', [row('a')])
  m.state.reason.value = '通过'
  const request = m.state.submit()
  await m.state.submit()
  assert.equal(calls, 1)
  m.props.projectId = 'new'
  await nextTick()
  resolve([{ activity: { id: 'a', reviewState: 'APPROVED' } }])
  await request
  assert.equal(m.saved(), 0)
  assert.equal(m.state.open.value, false)
  assert.equal(m.state.busy.value, false)
  assert.equal(m.state.detail.value, undefined)
  m.stop()
})
