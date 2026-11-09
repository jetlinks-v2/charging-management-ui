import { readFileSync, readdirSync } from 'node:fs'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('收费不再重复提供物业基础菜单，开发与联合构建加载公共模块', () => {
  const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
  const menus = read('../baseMenu.json')
  assert.ok(menus.length > 0)
  const visit = (items) => items.flatMap((menu) => [menu, ...visit(menu.children || [])])
  const nodes = visit(menus)
  assert.equal(
    nodes.some((menu) => menu.id === 'charging-basic'),
    false
  )
  for (const node of nodes.filter((node) => node.code && !node.children?.length)) {
    assert.ok(readFileSync(new URL(`../views/${node.code}/index.vue`, import.meta.url), 'utf8').includes('<template>'))
  }
  const { scripts } = read('../package.json')
  assert.match(scripts.dev, /charging-management-ui,property-base-ui,authentication-manager-ui/)
  assert.match(scripts['build:with-base'], /charging-management-ui,property-base-ui,authentication-manager-ui/)
})

test('收费菜单在宿主中是运行端资源，不接管公共基础菜单或应用归属', async () => {
  const output = await build({
    entryPoints: [fileURLToPath(new URL('../baseMenu.ts', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs'
  })
  const module = { exports: {} }
  new Function('module', 'exports', output.outputFiles[0].text)(module, module.exports)
  const menus = module.exports.default()
  const visit = (nodes) => nodes.flatMap((node) => [node, ...visit(node.children || [])])
  const nodes = visit(menus)
  assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length)
  for (const node of nodes) {
    assert.equal(node.runtime, true)
    assert.equal(node.options?.appName, undefined)
    assert.notEqual(node.id, 'charging-basic')
  }
})

test('收费设置每个按钮权限都能在菜单中独立配置并映射到已有接口权限', () => {
  const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))
  const visit = (nodes) => nodes.flatMap((node) => [node, ...visit(node.children || [])])
  const menu = visit(menus).find((node) => node.code === 'charging/FinanceSetting')
  const buttons = new Map(menu.buttons.map((button) => [button.id, button]))
  assert.equal(buttons.size, menu.buttons.length)
  for (const [id, action] of [
    ['change-customer', 'save'],
    ['next-version', 'save'],
    ['stop', 'save']
  ]) {
    assert.ok(buttons.has(id), `缺少独立按钮权限 ${id}`)
    assert.ok(buttons.get(id).permissions.some(
      (permission) => permission.permission === 'property-finance-setting' && permission.actions.includes(action)
    ))
  }
  const directory = new URL('../views/charging/FinanceSetting/', import.meta.url)
  for (const file of readdirSync(directory).filter((file) => file.endsWith('.vue'))) {
    const source = readFileSync(new URL(file, directory), 'utf8')
    for (const [, id] of source.matchAll(/\$\{settingPermission\}:([\w-]+)/g)) {
      assert.ok(buttons.has(id), `${file} 引用了未配置的按钮权限 ${id}`)
    }
  }
  const table = readFileSync(new URL('SettingTable.vue', directory), 'utf8')
  assert.equal(buttons.has('calculate'), false)
  assert.equal(buttons.has('retry-task'), false)
  assert.equal(menu.buttons.some((button) => button.permissions.some(
    (permission) => permission.permission === 'property-finance-setting' && permission.actions.includes('calculate')
  )), false)
  const tasks = readFileSync(new URL('SettingTasks.vue', directory), 'utf8')
  assert.equal(tasks.includes('retry(row)'), false)
  assert.equal(tasks.includes('Setting.retryTask'), false)
  assert.equal(table.includes('generate(row)'), false)
  assert.equal(table.includes('Setting.calculate'), false)
  for (const id of ['change-customer', 'next-version', 'stop']) {
    assert.ok(table.includes('${settingPermission}:' + id), `操作未使用独立权限 ${id}`)
  }
})
