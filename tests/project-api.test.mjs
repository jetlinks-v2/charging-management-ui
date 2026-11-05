import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const built = await build({
  entryPoints: [fileURLToPath(new URL('../api/project.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  plugins: [
    {
      name: 'public-registry',
      setup(b) {
        b.onResolve({ filter: /module-registry$/ }, (a) => ({
          path: a.path,
          namespace: 'public'
        }))
        b.onLoad({ filter: /.*/, namespace: 'public' }, () => ({
          contents:
            'export const moduleRegistry = { getResourceItem: (...args) => globalThis.__projectResource(...args) }'
        }))
      }
    }
  ]
})
const m = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, m, m.exports)
const { getProjectOptions } = m.exports

test('收费项目选择消费独立基础模块公开资源，缺少模块与空项目有区别', async () => {
  globalThis.__projectResource = (module, kind, name) => {
    assert.deepEqual([module, kind, name], ['property-base-ui', 'apis', 'getProjectOptions'])
  }
  assert.deepEqual(await getProjectOptions(), { status: 'notConfigured' })
  globalThis.__projectResource = (_module, _kind, name) =>
    name === 'getOrganizationTree'
      ? async () => ({
          success: true,
          result: [{ id: 'company', name: '公司', children: [{ id: 'p', name: '园区' }] }]
        })
      : async () => ({ status: 'ready', options: [{ id: 'p', name: '园区' }] })
  assert.deepEqual(await getProjectOptions(), {
    status: 'ready',
    options: [
      {
        id: 'p',
        name: '园区',
        organizationPath: [
          { id: 'company', name: '公司' },
          { id: 'p', name: '园区' }
        ]
      }
    ]
  })
})

test('基础资源查询失败沿用原异常，不伪造空项目或恢复旧基础接口', async () => {
  const failure = new Error('source unavailable')
  globalThis.__projectResource = () => async () => {
    throw failure
  }
  await assert.rejects(getProjectOptions(), (e) => e === failure)
})
