import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, ref } from 'vue'

const require = createRequire(import.meta.url)
const result = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-setting/useFinanceSpaceScope.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'public-resources',
      setup(b) {
        b.onResolve({ filter: /module-registry$|project\/useProjectContext$/ }, (a) => ({
          path: a.path,
          namespace: 'public'
        }))
        b.onLoad({ filter: /.*/, namespace: 'public' }, (a) => ({
          contents: a.path.includes('module-registry')
            ? 'export const moduleRegistry={getResourceItem:(...args)=>globalThis.__spaceResource(...args)}'
            : 'export const useProjectContext=()=>globalThis.__spaceProject'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, m, m.exports)
const { useFinanceSpaceScope, flattenSpaces } = m.exports
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const tick = () => new Promise((resolve) => setImmediate(resolve))

test('收费空间树只读公开资源并跟随全局项目，丢弃切换前和销毁后的结果', async () => {
  const projectId = ref('a')
  globalThis.__spaceProject = { projectId, projects: ref([{ id: 'a' }, { id: 'b' }]) }
  const requests = []
  globalThis.__spaceResource = (...args) => {
    assert.deepEqual(args, ['property-base-ui', 'apis', 'getSpaceTree'])
    return (p) => {
      const pending = deferred()
      requests.push({ p, ...pending })
      return pending.promise
    }
  }
  const scope = effectScope()
  const state = scope.run(useFinanceSpaceScope)
  assert.equal(requests[0].p, 'a')
  projectId.value = 'b'
  requests[1].resolve([{ id: 'b1', name: '1栋', children: [{ id: 'r', name: '101' }] }])
  await tick()
  requests[0].resolve([{ id: 'a1', name: '旧项目' }])
  await tick()
  assert.equal(state.tree.value[0].id, 'b1')
  state.selectedId.value = 'b1'
  assert.deepEqual(
    flattenSpaces([state.selected.value]).map((n) => n.id),
    ['b1', 'r']
  )
  state.keyword.value = '101'
  assert.equal(state.visibleTree.value[0].children[0].id, 'r')
  projectId.value = ''
  assert.deepEqual(state.tree.value, [])
  assert.equal(state.selectedId.value, undefined)
  assert.equal(state.loading.value, false)
  projectId.value = 'a'
  scope.stop()
  requests[2].resolve([{ id: 'late', name: '迟到' }])
  await tick()
  assert.deepEqual(state.tree.value, [])
})

test('未安装基础模块和来源失败明确失败，不伪造可选空间', async () => {
  globalThis.__spaceProject = { projectId: ref('p'), projects: ref([]) }
  for (const resource of [
    undefined,
    async () => {
      throw new Error('upstream unavailable')
    }
  ]) {
    globalThis.__spaceResource = () => resource
    const scope = effectScope()
    const state = scope.run(useFinanceSpaceScope)
    await tick()
    assert.equal(state.failed.value, true)
    assert.equal(state.loading.value, false)
    assert.deepEqual(state.tree.value, [])
    scope.stop()
  }
})
