import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from 'vue/compiler-sfc'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const visit = (nodes) => nodes.flatMap((node) => [node, ...visit(node.children || [])])
const menus = visit(JSON.parse(read('baseMenu.json')))
const grants = new Set(menus.flatMap((menu) => (menu.buttons || []).map((button) => `${menu.code}:${button.id}`)))

test('收费菜单及按钮标识唯一，叶子节点均对应可加载页面', () => {
  for (const field of ['id', 'code', 'url']) {
    assert.equal(new Set(menus.map((menu) => menu[field])).size, menus.length, field)
  }
  for (const menu of menus) {
    assert.equal(new Set((menu.buttons || []).map((button) => button.id)).size, (menu.buttons || []).length)
    if (!menu.children?.length) assert.ok(read(`views/${menu.code}/index.vue`).includes('<template>'))
    for (const button of menu.buttons || []) {
      assert.ok(button.permissions?.length, `${menu.code}:${button.id}`)
      assert.ok(button.permissions.every((permission) => permission.permission && permission.actions?.length))
    }
  }
})

test('页面直接声明的收费按钮权限均可通过菜单初始化授予', () => {
  const scan = (path) => {
    for (const item of readdirSync(new URL('../' + path, import.meta.url), { withFileTypes: true })) {
      const file = `${path}/${item.name}`
      if (item.isDirectory()) scan(file)
      else if (/\.(vue|ts)$/.test(item.name)) {
        for (const [, permission] of read(file).matchAll(/\b(charging\/\w+:[\w-]+)/g)) {
          assert.ok(grants.has(permission), `${file}: ${permission}`)
        }
      }
    }
  }
  scan('views/charging')
  scan('hooks')
})

test('交账与月结的确认按钮使用所属菜单授权，包含批量操作', () => {
  const cases = [
    [
      'FinanceHandover/HandoverAction.vue',
      'charging/FinanceHandoverRecord',
      ['APPROVE', 'REJECT', 'UNAPPROVE', 'CANCEL']
    ],
    ['FinanceHandover/HandoverBatch.vue', 'charging/FinanceHandoverRecord', ['APPROVE', 'UNAPPROVE']],
    ['FinanceMonthClosing/ClosingBatch.vue', 'charging/FinanceMonthClosing', ['CLOSE', 'REOPEN']]
  ]
  for (const [file, code, actions] of cases) {
    const template = parse(read('views/charging/' + file)).descriptor.template.ast
    const buttons = visit(template.children).filter((node) => node.tag === 'j-permission-button')
    const expression = buttons.flatMap((node) => node.props).find((prop) => prop.arg?.content === 'hasPermission')
      ?.exp?.content
    assert.ok(expression, file)
    for (const action of actions) {
      const permission = new Function('action', `return ${expression}`)(action)
      assert.equal(permission, `${code}:${action.toLowerCase()}`)
      assert.ok(grants.has(permission), `${file}: ${permission}`)
    }
  }
})
