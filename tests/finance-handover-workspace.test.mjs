import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref } from 'vue'

const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-handover/useHandoverWorkspace.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  plugins: [{ name: 'workspace-boundaries', setup(b) {
    b.onResolve({ filter: /api\/financeHandover|vue-i18n|@jetlinks-web|useProjectContext|useHandoverRecovery/ },
      a => ({ path: a.path, namespace: 'mock' }))
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents:
      a.path.includes('financeHandover') ? 'export const queryHandovers=()=>{}; export const getHandover=()=>{}' :
      a.path === 'vue-i18n' ? 'export const useI18n=()=>({t:k=>k})' :
      a.path === '@jetlinks-web/hooks' ? 'export const usePermission=()=>({hasPerm:globalThis.__handoverPermission})' :
      a.path.includes('useProjectContext') ? 'export const useProjectContext=()=>({projectId:globalThis.__handoverProject});export const useProjectSwitchGuard=()=>{}' :
      a.path.includes('useHandoverRecovery') ? 'export const useHandoverRecovery=()=>({read:()=>undefined})' :
      'export const onlyMessage=()=>{}'
    }))
  }}]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const renderer = createRenderer({
  patchProp() {}, insert() {}, remove() {}, createElement: () => ({}), createText: () => ({}),
  createComment: () => ({}), setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null
})
const row = () => ({
  id: 'display-line', sourceId: 'payment-source', type: 'PAYMENT', version: 7,
  line: { occurredAt: '2026-11-06T14:00:00', customerName: '客户', companyName: '公司', amount: '40.00', cashAmount: '40.00' }
})
function mount() {
  globalThis.__handoverPermission = ref(true)
  globalThis.__handoverProject = ref('project')
  let state
  const app = renderer.createApp(defineComponent({ setup() {
    state = mod.exports.useHandoverWorkspace('sources')
    return () => h('div')
  }}))
  app.mount({})
  return { state, unmount: () => app.unmount() }
}

test('单笔交账使用来源业务及版本，不夹带已勾选的其他业务', () => {
  const m = mount()
  m.state.selected.value = [{ id: 'other-payment', type: 'PAYMENT', version: 1 }]
  m.state.startSingle(row())
  assert.equal(m.state.editorOpen.value, true)
  assert.deepEqual(m.state.targets.value.map(({ id, type, version }) => ({ id, type, version })),
    [{ id: 'payment-source', type: 'PAYMENT', version: 7 }])
  assert.equal(m.state.selected.value[0].id, 'other-payment')
  m.unmount()
})

test('已交账、无权限、无项目和已有待处理操作时不能发起单笔交账', () => {
  for (const prepare of [
    m => ({ ...row(), batchId: 'existing-batch' }),
    m => { globalThis.__handoverPermission.value = false; return row() },
    m => { globalThis.__handoverProject.value = ''; return row() },
    m => { m.state.pendingCreate.value = true; return row() }
  ]) {
    const m = mount()
    m.state.startSingle(prepare(m))
    assert.equal(m.state.editorOpen.value, false)
    assert.deepEqual(m.state.targets.value, [])
    m.unmount()
  }
})

test('批量交账继续使用当前勾选，单笔入口关闭后可以重新批量发起', () => {
  const m = mount()
  m.state.selected.value = [{ id: 'selected-payment', type: 'PAYMENT', version: 2 }]
  m.state.startSingle(row())
  m.state.closeEditor()
  m.state.start()
  assert.deepEqual(m.state.targets.value.map(item => item.id), ['selected-payment'])
  m.unmount()
})
