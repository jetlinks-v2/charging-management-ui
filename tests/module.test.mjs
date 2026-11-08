import { readFileSync } from 'node:fs'
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
