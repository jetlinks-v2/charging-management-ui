import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const built = await build({
  entryPoints: [fileURLToPath(new URL('utils/menuNavigation.ts', root))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  alias: { '@jetlinks-web-core': fileURLToPath(new URL('../../jetlinks-web-core/src', root)) }
})
const compiled = { exports: {} }
new Function('module', 'exports', built.outputFiles[0].text)(compiled, compiled.exports)
const filter = compiled.exports.chargingMenuFilter.filter
const definitions = JSON.parse(readFileSync(new URL('baseMenu.json', root), 'utf8'))
const system = definitions[0]
const other = { id: 'charging-basic', code: 'charging/basic', name: '物业基础管理', url: '/basic' }

test('收费系统分组包含概览、业务分组及末尾收费配置，公共基础菜单保持独立', () => {
  assert.equal(definitions.length, 1)
  assert.equal(system.code, 'charging-management')
  assert.equal(system.name, '收费管理')
  assert.deepEqual(
    system.children.map((item) => item.code),
    [
      'charging/FinanceOverview',
      'charging/finance',
      'charging/payment',
      'charging/FinanceActivity',
      'charging/documents',
      'charging/reports',
      'charging/configuration'
    ]
  )
  assert.match(readFileSync(new URL('index.ts', root), 'utf8'), /getMenuFilters/)
})

test('无应用上下文与项目入口保留完整授权系统树', () => {
  const menus = [other, system]
  for (const applicationScope of [
    undefined,
    '',
    '  ',
    '__jetlinks_project__',
    'business_application:__jetlinks_project__'
  ]) {
    assert.strictEqual(filter(menus, { applicationScope }), menus)
  }
})

test('独立应用只展开收费根节点一层，不修改原数据或基础菜单，重复处理稳定', () => {
  const menus = structuredClone([other, system])
  const before = structuredClone(menus)
  const navigation = filter(menus, { applicationScope: 'business_application:charging-app' })
  assert.deepEqual(navigation, [other, ...system.children])
  assert.strictEqual(navigation[0], menus[0])
  assert.deepEqual(menus, before)
  assert.deepEqual(filter(navigation, { applicationScope: 'charging-app' }), navigation)
})

test('部分授权仅展开服务端已有菜单，不补未授权节点或按钮，兼容原平铺菜单', () => {
  const page = { ...system.children[0], buttons: [{ id: 'query' }], children: [] }
  assert.deepEqual(filter([{ ...system, children: [page] }], { applicationScope: 'charging-app' }), [page])
  for (const children of [undefined, []]) {
    assert.deepEqual(filter([{ ...system, children }], { applicationScope: 'charging-app' }), [])
  }
  const flat = [other, page]
  assert.deepEqual(filter(flat, { applicationScope: 'charging-app' }), flat)
})

test('收费配置的初始化地址位于自己的分组下', () => {
  const configuration = system.children.find(item => item.code === 'charging/configuration')
  assert.deepEqual(configuration.children.map(item => [item.code, item.url]), [
    ['charging/FinanceCompany', '/charging/configuration/companies'],
    ['charging/FinanceTax', '/charging/configuration/taxes'],
    ['charging/FinanceArrears', '/charging/configuration/arrears']
  ])
})

test('旧授权树在生成路由前修正配置地址，保留原数据、授权和项目分组', () => {
  const legacy = structuredClone(system)
  const configuration = legacy.children.find(item => item.code === 'charging/configuration')
  for (const item of configuration.children) item.url = item.url.replace('/configuration/', '/finance/')
  const before = structuredClone(legacy)
  for (const applicationScope of [undefined, '__jetlinks_project__', 'charging-app']) {
    const result = filter([legacy], { applicationScope })
    const groups = applicationScope === 'charging-app' ? result : result[0].children
    const config = groups.find(item => item.code === 'charging/configuration')
    assert.deepEqual(config, system.children.find(item => item.code === 'charging/configuration'))
    assert.strictEqual(groups.find(item => item.code === 'charging/finance'), legacy.children.find(item => item.code === 'charging/finance'))
    assert.deepEqual(filter(result, { applicationScope }), result)
  }
  assert.deepEqual(legacy, before)
})

test('兼容部分授权且不覆盖自定义地址或其他菜单，配置分组仍可被任意上级包裹', () => {
  const config = structuredClone(system.children.find(item => item.code === 'charging/configuration'))
  const allowed = { ...config.children[0], url: '/charging/finance/companies', buttons: [{ id: 'query' }] }
  config.children = [allowed]
  const outside = { ...allowed, code: 'another/Company', url: '/charging/finance/companies' }
  const result = filter([{ ...other, children: [config] }, outside], { applicationScope: 'charging-app' })
  assert.deepEqual(result[0].children[0].children, [{ ...allowed, url: '/charging/configuration/companies' }])
  assert.strictEqual(result[1], outside)
  const custom = { ...allowed, url: '/custom/tax-accounts' }
  const menus = [{ ...config, children: [custom] }]
  assert.strictEqual(filter(menus, { applicationScope: '__jetlinks_project__' }), menus)
})
