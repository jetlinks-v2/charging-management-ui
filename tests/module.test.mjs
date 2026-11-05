import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('收费不再重复提供物业基础菜单，开发与联合构建加载公共模块', () => {
  const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
  assert.deepEqual(read('../baseMenu.json'), [])
  const { scripts } = read('../package.json')
  assert.match(scripts.dev, /charging-management-ui,property-base-ui,authentication-manager-ui/)
  assert.match(scripts['build:with-base'], /charging-management-ui,property-base-ui/)
})
