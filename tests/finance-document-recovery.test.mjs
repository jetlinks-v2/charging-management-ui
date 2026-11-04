import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive, ref } from 'vue'
const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-document/useDocumentRecovery.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'platform',
      setup(b) {
        b.onResolve({ filter: /@jetlinks-web-core/ }, (a) => ({ path: a.path, namespace: 'mock' }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('store/user')
            ? 'export const useUserStore=()=>globalThis.__documentIdentity'
            : a.path.includes('request-context')
              ? 'export const getApplicationAccessContext=()=>globalThis.__documentIdentity'
              : 'export const getApplicationRuntimeEntry=()=>globalThis.__documentIdentity'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
function setup() {
  const storage = new Map()
  globalThis.window = {
    location: { pathname: '/tenant' },
    sessionStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    }
  }
  globalThis.__documentIdentity = reactive({ userInfo: { id: 'user' }, domain: 'domain', applicationId: 'app' })
  return storage
}
const issued = () => ({
  request: { requestId: 'request', token: 'token', input: { documentType: 'INVOICE', items: [{ sourceId: 'bill' }] } },
  preview: { token: 'token', documentType: 'INVOICE' }
})
test('待确认请求按账号租户应用项目类型和操作隔离', () => {
  setup()
  const project = ref('project'),
    use = mod.exports.useDocumentRecovery
  const store = use(project, 'INVOICE', 'issue')
  store.write(issued())
  assert.deepEqual(store.read(), issued())
  assert.equal(use(project, 'RECEIPT', 'issue').read(), undefined)
  assert.equal(use(project, 'INVOICE', 'reverse').read(), undefined)
  project.value = 'other'
  assert.equal(store.read(), undefined)
  project.value = 'project'
  for (const key of ['domain', 'applicationId']) {
    const original = globalThis.__documentIdentity[key]
    globalThis.__documentIdentity[key] = 'other'
    assert.equal(store.read(), undefined)
    globalThis.__documentIdentity[key] = original
  }
  globalThis.__documentIdentity.userInfo.id = 'other'
  assert.equal(store.read(), undefined)
  globalThis.__documentIdentity.userInfo.id = 'user'
  assert.deepEqual(store.read(), issued())
  store.clear()
  assert.equal(store.read(), undefined)
})
test('损坏token或跨票据类型数据明确失败，不能当作无待确认请求', () => {
  const map = setup(),
    store = mod.exports.useDocumentRecovery(ref('project'), 'INVOICE', 'issue')
  store.write(issued())
  const key = [...map.keys()][0]
  map.set(key, '{')
  assert.throws(() => store.read())
  const changed = issued()
  changed.preview.documentType = 'RECEIPT'
  map.set(key, JSON.stringify(changed))
  assert.throws(() => store.read(), /scope/)
  changed.preview.documentType = 'INVOICE'
  changed.request.token = 'changed'
  map.set(key, JSON.stringify(changed))
  assert.throws(() => store.read(), /Invalid/)
})
test('红冲恢复须与原票类型编号版本对应', () => {
  setup()
  const store = mod.exports.useDocumentRecovery(ref('project'), 'INVOICE', 'reverse')
  const pending = {
    request: { requestId: 'reverse', token: 'token', input: { id: 'blue', version: 2, reason: '误开' } },
    preview: { token: 'token', document: { id: 'blue', version: 2, documentType: 'INVOICE' } }
  }
  store.write(pending)
  assert.deepEqual(store.read(), pending)
  pending.request.input.version = 3
  store.write(pending)
  assert.throws(() => store.read(), /scope/)
})
