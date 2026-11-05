import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const compiled = await build({
  entryPoints: [
    new URL('../hooks/project/createProjectContext.ts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
  ],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue']
})
const module = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports)
const { createProjectContext } = module.exports
const options = [
  { id: 'a', name: '同名' },
  { id: 'b', name: '同名' }
]
const defer = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function setup(load = async () => options) {
  const storage = new Map()
  let identity = 'user-a:tenant-a'
  const context = createProjectContext({
    load,
    identity: () => identity,
    read: (key) => storage.get(key) || '',
    write: (key, id) => storage.set(key, id)
  })
  return {
    context,
    storage,
    account: (value) => {
      identity = value
    }
  }
}
test('多项目不默认首项，确认后共享选择并按会话恢复', async () => {
  const { context, storage } = setup()
  await context.refresh()
  assert.equal(context.projectId.value, '')
  assert.equal(await context.select('b'), true)
  assert.equal(context.current.value.name, '同名')
  await context.refresh()
  assert.equal(context.projectId.value, 'b')
  assert.equal([...storage.values()][0], 'b')
  assert.equal(await context.select('forged'), false)
})
test('编辑守卫阻止切换，解除后只提交新项目一次', async () => {
  const { context } = setup()
  await context.refresh()
  await context.select('a')
  const remove = context.guard(() => false)
  assert.equal(await context.select('b'), false)
  assert.equal(context.projectId.value, 'a')
  remove()
  assert.equal(await context.select('b'), true)
})
test('重新进入收费必须再次确认项目，不自动应用上次偏好', async () => {
  const { context, storage } = setup()
  await context.refresh()
  await context.select('b')
  const restored = createProjectContext({
    load: async () => options,
    identity: () => 'user-a:tenant-a',
    read: (key) => storage.get(key) || '',
    write: (key, value) => storage.set(key, value)
  })
  await restored.refresh()
  assert.equal(restored.projectId.value, '')
})
test('重复确认不会重复执行守卫，守卫等待期间账号失效不能提交选择', async () => {
  const { context, account } = setup()
  await context.refresh()
  const delayed = defer()
  let calls = 0
  context.guard(() => {
    calls++
    return delayed.promise
  })
  const pending = context.select('a')
  assert.equal(await context.select('b'), false)
  account('other-account')
  context.reset()
  delayed.resolve(true)
  assert.equal(await pending, false)
  assert.equal(calls, 1)
  assert.equal(context.projectId.value, '')
})
test('撤销权限会清空原项目；账号变化不会复用前一个账号的项目', async () => {
  let visible = options
  const { context, account } = setup(async () => visible)
  await context.refresh()
  await context.select('b')
  account('user-b:tenant-a')
  await context.refresh()
  assert.equal(context.projectId.value, '')
  account('user-a:tenant-a')
  visible = [options[0]]
  await context.refresh()
  assert.equal(context.projectId.value, '')
  visible = []
  await context.refresh()
  assert.equal(context.projectId.value, '')
})
test('迟到的项目请求不能覆盖新账号或更新的权限结果', async () => {
  const old = defer()
  let calls = 0
  const { context, account } = setup(() => (++calls === 1 ? old.promise : Promise.resolve([options[1]])))
  const pending = context.refresh()
  account('user-b:tenant-b')
  await context.refresh()
  old.resolve([options[0]])
  await pending
  assert.deepEqual(
    context.projects.value.map((p) => p.id),
    ['b']
  )
  assert.equal(context.projectId.value, '')
})
test('请求失败不恢复未经核验的项目且明确暴露失败状态', async () => {
  let fail = false
  const { context } = setup(async () => {
    if (fail) throw new Error('unavailable')
    return options
  })
  await context.refresh()
  await context.select('a')
  fail = true
  await assert.rejects(context.refresh())
  assert.equal(context.failed.value, true)
  assert.equal(context.projectId.value, '')
  assert.deepEqual(context.projects.value, [])
})

// 普通业务和报表共享同一个选择器，报表范围不能反向污染单项目写账。
test('报表多项目范围独立于单项目写账且接受统一切换守卫', async () => {
  const { context } = setup()
  await context.refresh()
  assert.equal(await context.selectMany(['a', 'b']), true)
  assert.deepEqual([...context.reportProjectIds.value], ['a', 'b'])
  assert.equal(context.projectId.value, '')
  assert.equal(await context.select('b'), true)
  assert.deepEqual([...context.reportProjectIds.value], ['a', 'b'])
  const remove = context.guard(() => false)
  assert.equal(await context.selectMany(['b']), false)
  remove()
  assert.equal(await context.selectMany(['forged']), false)
  assert.equal(await context.selectMany([]), false)
})
