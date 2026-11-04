import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive, ref } from 'vue'
const require = createRequire(import.meta.url)
const output = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-handover/useHandoverRecovery.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'identity',
      setup(b) {
        b.onResolve({ filter: /@jetlinks-web-core/ }, (a) => ({ path: a.path, namespace: 'mock' }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('store/user')
            ? 'export const useUserStore=()=>globalThis.__handoverIdentity'
            : a.path.includes('request-context')
              ? 'export const getApplicationAccessContext=()=>globalThis.__handoverIdentity'
              : 'export const getApplicationRuntimeEntry=()=>globalThis.__handoverIdentity'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports)
function setup() {
  const map = new Map()
  globalThis.window = {
    location: { pathname: '/tenant' },
    sessionStorage: { getItem: (k) => map.get(k), setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) }
  }
  globalThis.__handoverIdentity = reactive({ userInfo: { id: 'user' }, domain: 'domain', applicationId: 'app' })
  return map
}
const create = () => ({
  request: {
    requestId: 'request',
    token: 'token',
    input: { items: [{ type: 'PAYMENT', id: 'pay', version: 2 }], closingDate: '2026-11-05' }
  },
  preview: {
    token: 'token',
    sourceCount: 1,
    lines: [{ sourceType: 'PAYMENT', sourceId: 'pay' }],
    amount: '100.00',
    cashAmount: '60.00'
  }
})
test('交账待确认请求按账号租户应用项目及动作隔离', () => {
  setup()
  const project = ref('project'),
    use = mod.exports.useHandoverRecovery,
    store = use(project, 'create')
  store.write(create())
  assert.deepEqual(store.read(), create())
  assert.equal(use(project, 'action').read(), undefined)
  for (const field of ['domain', 'applicationId']) {
    const old = globalThis.__handoverIdentity[field]
    globalThis.__handoverIdentity[field] = 'other'
    assert.equal(store.read(), undefined)
    globalThis.__handoverIdentity[field] = old
  }
  globalThis.__handoverIdentity.userInfo.id = 'other'
  assert.equal(store.read(), undefined)
  globalThis.__handoverIdentity.userInfo.id = 'user'
  project.value = 'other'
  assert.equal(store.read(), undefined)
  project.value = 'project'
  assert.deepEqual(store.read(), create())
  store.clear()
  assert.equal(store.read(), undefined)
})
test('损坏内容或与来源不符的预览必须明确拒绝恢复', () => {
  const map = setup(),
    store = mod.exports.useHandoverRecovery('project', 'create')
  store.write(create())
  const key = [...map.keys()][0]
  map.set(key, '{')
  assert.throws(() => store.read())
  const mismatch = create()
  mismatch.preview.lines[0].sourceId = 'other'
  map.set(key, JSON.stringify(mismatch))
  assert.throws(() => store.read(), /scope/)
})
test('审核恢复绑定原项目批次版本和动作，不能改挂其他批次', () => {
  const map = setup(),
    store = mod.exports.useHandoverRecovery('project', 'action')
  const data = {
    request: {
      requestId: 'a',
      token: 'token',
      input: { id: 'batch', action: 'APPROVE', version: 3, reason: '已核对' }
    },
    preview: { token: 'token', batch: { id: 'batch', projectId: 'project', version: 3 } }
  }
  store.write(data)
  assert.deepEqual(store.read(), data)
  data.preview.batch.projectId = 'other'
  map.set([...map.keys()][0], JSON.stringify(data))
  assert.throws(() => store.read(), /scope/)
})
