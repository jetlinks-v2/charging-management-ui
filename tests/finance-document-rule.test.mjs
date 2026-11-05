import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-document/useDocumentRule.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(b) {
        b.onResolve(
          { filter: /api\/financeDocument|project\/useProjectContext|@jetlinks-web\/utils|vue-i18n/ },
          (a) => ({ path: a.path, namespace: 'mock' })
        )
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          contents: a.path.includes('financeDocument')
            ? ['getDocumentRule', 'saveDocumentRule']
                .map((n) => `export const ${n}=(...a)=>globalThis.__ruleApi.${n}(...a)`)
                .join('\n')
            : a.path.includes('useProjectContext')
              ? 'export const useProjectContext=()=>({projectId:globalThis.__ruleProject});export const useProjectSwitchGuard=fn=>globalThis.__ruleGuard=fn'
              : a.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__ruleMessages.push(a)'
        }))
      }
    }
  ]
})
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports)
const rule = { version: 3, timeLimitType: 'CUSTOM_DAYS', limitDays: 90, maxReopenTimes: 2 }
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
function mount(overrides = {}) {
  globalThis.__ruleProject = ref('project')
  globalThis.__ruleMessages = []
  globalThis.__ruleApi = {
    getDocumentRule: async () => ({ ...rule }),
    saveDocumentRule: async (_p, input) => ({ ...input, version: 4 }),
    ...overrides
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
        state = mod.exports.useDocumentRule()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, project: globalThis.__ruleProject, unmount: () => app.unmount() }
}
test('规则只读加载，编辑期间阻止跨项目，保存版本及原因保留空重开限制', async () => {
  let received
  const m = mount({
    saveDocumentRule: async (p, input) => {
      received = [p, input]
      return { ...input, version: 4 }
    }
  })
  await flush()
  assert.equal(m.state.editing.value, false)
  assert.equal(globalThis.__ruleGuard(), true)
  m.state.edit()
  assert.equal(globalThis.__ruleGuard(), false)
  m.state.model.timeLimitType = 'NATURAL_YEAR'
  m.state.model.maxReopenTimes = null
  m.state.model.reason = '  按项目调整  '
  await m.state.save()
  assert.deepEqual(received, [
    'project',
    { version: 3, timeLimitType: 'NATURAL_YEAR', limitDays: null, maxReopenTimes: null, reason: '按项目调整' }
  ])
  assert.equal(m.state.current.value.version, 4)
  assert.equal(m.state.editing.value, false)
  m.unmount()
})
test('并发版本冲突保留用户输入，不静默覆盖或误报成功', async () => {
  const m = mount({
    saveDocumentRule: async () => {
      throw { response: { status: 409, data: { message: '规则已被其他人修改' } } }
    }
  })
  await flush()
  m.state.edit()
  m.state.model.reason = '本次调整'
  m.state.model.limitDays = 30
  await m.state.save()
  assert.equal(m.state.editing.value, true)
  assert.equal(m.state.model.version, 3)
  assert.equal(m.state.model.reason, '本次调整')
  assert.equal(m.state.model.limitDays, 30)
  assert.equal(m.state.current.value.limitDays, 90)
  assert.equal(globalThis.__ruleMessages.at(-1)[0], '规则已被其他人修改')
  m.unmount()
})
test('非法天数重开数及空原因不提交，保存中互斥且项目守卫拒绝切换', async () => {
  let count = 0,
    finish
  const m = mount({
    saveDocumentRule: async () => {
      count++
      return await new Promise((r) => {
        finish = () => r({ ...rule, version: 4 })
      })
    }
  })
  await flush()
  m.state.edit()
  await m.state.save()
  assert.equal(count, 0)
  m.state.model.reason = '修改'
  for (const value of [null, 0, 36501, 1.2]) {
    m.state.model.limitDays = value
    await m.state.save()
  }
  m.state.model.limitDays = 30
  m.state.model.maxReopenTimes = -1
  await m.state.save()
  assert.equal(count, 0)
  m.state.model.maxReopenTimes = 0
  const task = m.state.save()
  await m.state.save()
  assert.equal(count, 1)
  assert.equal(globalThis.__ruleGuard(), false)
  finish()
  await task
  assert.equal(globalThis.__ruleGuard(), true)
  m.unmount()
})
test('旧项目加载慢响应不覆盖新项目，卸载后不回写状态', async () => {
  const resolves = new Map()
  const m = mount({ getDocumentRule: (project) => new Promise((resolve) => resolves.set(project, resolve)) })
  m.project.value = 'next'
  await nextTick()
  resolves.get('next')({ ...rule, version: 9 })
  await flush()
  resolves.get('project')({ ...rule, version: 1 })
  await flush()
  assert.equal(m.state.current.value.version, 9)
  m.project.value = 'last'
  await nextTick()
  m.unmount()
  resolves.get('last')({ ...rule, version: 10 })
  await flush()
  assert.equal(m.state.current.value, undefined)
})
