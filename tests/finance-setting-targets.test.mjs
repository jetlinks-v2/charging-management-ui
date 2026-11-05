import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, reactive, nextTick } from 'vue'
const result = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-setting/useSettingTargetList.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue']
})
const module = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports
)
const { useSettingTargetList } = module.exports
const target = (id, count = 2) => ({
  context: {
    house: { spaceId: id, fullName: id },
    customers: Array.from({ length: count }, (_, i) => ({ relationshipId: `${id}-${i}` }))
  },
  relationshipIds: []
})
function fixture(targets) {
  const props = reactive({ targets, busy: false, batch: true, canChoose: true })
  const scope = effectScope()
  const state = scope.run(() => useSettingTargetList(() => props))
  return { props, state, stop: () => scope.stop() }
}
test('批量选择必须明确触发，逐房使用自己的客户关系，无客户房屋继续待处理', () => {
  const { props, state, stop } = fixture([target('101'), target('102', 3), target('103', 0)])
  assert.equal(state.pending.value, 3)
  assert.deepEqual(
    props.targets.map((row) => row.relationshipIds),
    [[], [], []]
  )
  state.selectAllCustomers()
  assert.deepEqual(
    props.targets.map((row) => row.relationshipIds),
    [['101-0', '101-1'], ['102-0', '102-1', '102-2'], []]
  )
  assert.equal(state.pending.value, 1)
  props.targets[0].relationshipIds = ['101-1']
  assert.equal(props.targets[1].relationshipIds.length, 3)
  stop()
})
test('翻页保留逐房选择，移除末页最后房屋回到有效页，不移除同页其他房屋', async () => {
  const { props, state, stop } = fixture(Array.from({ length: 6 }, (_, i) => target(String(i))))
  props.targets[0].relationshipIds = ['0-1']
  state.pagination.value.onChange(2)
  assert.equal(state.pagination.value.current, 2)
  state.removeHouse('5')
  await nextTick()
  assert.equal(state.pagination.value.current, 1)
  assert.equal(props.targets.length, 5)
  assert.deepEqual(props.targets[0].relationshipIds, ['0-1'])
  state.removeHouse('missing')
  assert.equal(props.targets.length, 5)
  stop()
})
test('加载或保存期间不改变收费对象和房屋，单房编辑不能移除房屋', () => {
  const { props, state, stop } = fixture([target('101')])
  props.busy = true
  state.selectAllCustomers()
  state.removeHouse('101')
  assert.equal(props.targets.length, 1)
  assert.deepEqual(props.targets[0].relationshipIds, [])
  props.busy = false
  props.batch = false
  state.removeHouse('101')
  assert.equal(props.targets.length, 1)
  stop()
})
test('全部房屋清空后分页和待选计数复位，没有客户时禁用批量选择', async () => {
  const { props, state, stop } = fixture(Array.from({ length: 12 }, (_, i) => target(String(i), 0)))
  state.pagination.value.onChange(3)
  assert.equal(state.hasCustomers.value, false)
  props.targets = []
  await nextTick()
  assert.equal(state.pagination.value.current, 1)
  assert.equal(state.pending.value, 0)
  stop()
})
