import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive, effectScope, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const result = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/project/useProjectPicker.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue']
})
const m = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, m, m.exports)
const { useProjectPicker } = m.exports
const company = { id: 'company', name: '公司' },
  branch = { id: 'branch', name: '分公司' }
const projects = Array.from({ length: 8 }, (_, i) => ({
  id: 'p' + i,
  name: '项目' + i,
  organizationPath: [company, ...(i < 7 ? [branch] : []), { id: 'p' + i, name: '项目' + i, isProject: true }]
}))
function setup(extra = {}) {
  const props = reactive({
    open: true,
    projects,
    currentId: '',
    multiple: true,
    loading: false,
    switching: false,
    ...extra
  })
  const scope = effectScope(),
    state = scope.run(() => useProjectPicker(props))
  return { props, state, close: () => scope.stop() }
}
test('组织树隐藏所有项目节点，包括无权选择的祖先项目', () => {
  const { state, close } = setup({
    projects: [
      ...projects,
      {
        id: 'child',
        name: '子项目',
        organizationPath: [
          company,
          { id: 'hidden', name: '上级项目', isProject: true },
          branch,
          { id: 'child', name: '子项目' }
        ]
      }
    ]
  })
  assert.deepEqual(JSON.parse(JSON.stringify(state.tree.value)), [
    { key: 'company', title: '公司', children: [{ key: 'branch', title: '分公司', children: [] }] }
  ])
  state.selectOrganization(['branch'])
  assert.equal(state.matches.value.length, 8)
  close()
})
test('跨页跨组织选择保留，取消重开恢复确认值', async () => {
  const { props, state, close } = setup({ selectedIds: ['p0'] })
  state.page.value = 2
  state.toggle(state.visible.value[0].id)
  state.selectOrganization(['branch'])
  await nextTick()
  assert.equal(state.page.value, 1)
  assert.equal(state.matches.value.length, 7)
  assert.deepEqual([...state.pending.value], ['p0', 'p6'])
  props.open = false
  await nextTick()
  props.open = true
  await nextTick()
  assert.deepEqual([...state.pending.value], ['p0'])
  close()
})
test('全选选择完整筛选范围而非当前页，取消全选保留其它组织项目', () => {
  const { state, close } = setup({ selectedIds: ['p7'] })
  state.selectOrganization(['branch'])
  state.toggleMatched()
  assert.equal(state.pending.value.length, 8)
  assert.equal(state.allMatched.value, true)
  state.toggleMatched()
  assert.deepEqual([...state.pending.value], ['p7'])
  close()
})
test('单选替换旧选项，权限撤回后不能确认失效项目', async () => {
  const { props, state, close } = setup({ multiple: false, currentId: 'p0' })
  state.toggle('p1')
  state.toggle('p2')
  state.toggle('forged')
  assert.deepEqual([...state.pending.value], ['p2'])
  props.projects = [projects[0]]
  await nextTick()
  assert.deepEqual([...state.pending.value], [])
  close()
})
test('报表最多100项目且加载时冻结草稿', () => {
  const { props, state, close } = setup({
    projects: Array.from({ length: 101 }, (_, i) => ({ id: String(i), name: String(i) })),
    selectedIds: Array.from({ length: 100 }, (_, i) => String(i))
  })
  state.toggle('100')
  state.toggleMatched()
  assert.equal(state.exceedsLimit.value, true)
  assert.equal(state.pending.value.length, 100)
  props.loading = true
  state.toggle('0')
  assert.equal(state.pending.value.length, 100)
  close()
})
