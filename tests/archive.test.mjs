import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
const require = createRequire(import.meta.url)
async function load(entry, apiNames = []) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(entry, import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: apiNames.length
      ? [
          {
            name: 'archive-api',
            setup(builder) {
              builder.onResolve({ filter: /api\/(archive|user)|project\/useProjectContext|@jetlinks-web|vue-i18n/ }, (args) => ({
                path: args.path,
                namespace: 'mock'
              }))
              builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
                contents: args.path.includes('project/useProjectContext')
                  ? `import {ref} from 'vue'; export const useProjectSwitchGuard = () => {}; export const useProjectContext = () => { const projects=ref([]), projectId=ref(''); return {projects, projectId, refresh: async () => { projects.value=await globalThis.__archiveApi.getSpaceProjects(); if (!projects.value.some(p=>p.id===projectId.value)) projectId.value=projects.value.length===1?projects.value[0].id:'' } } }`
                  : /api\/(archive|user)/.test(args.path)
                  ? apiNames
                      .map((name) => `export const ${name} = (...args) => globalThis.__archiveApi.${name}(...args)`)
                      .join('\n')
                  : args.path === 'vue-i18n'
                  ? 'export const useI18n = () => ({t: key => key, tm: () => ({spaceId: "空间标识", houseType: "房屋类型", houseState: "房态", billingArea: "计费面积"})})'
                  : 'export const onlyMessage = (message, type) => globalThis.__archiveMessages?.push({message, type}); export const downloadFileByUrl = (...args) => globalThis.__archiveDownloads?.push(args)'
              }))
            }
          }
        ]
      : []
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const customer = await load('../utils/customer.ts')
const errors = await load('../utils/requestError.ts')
const importValues = await load('../utils/archiveImport.ts')
const history = await load('../utils/historyQuery.ts')
const organizationSpaces = await load('../hooks/archive/useOrganizationSpaces.ts', [
  'getSpaceRoots',
  'getSpaceRootTree',
  'bindSpaceRoot',
  'syncSpaces'
])
const scopeModule = await load('../hooks/archive/useArchiveScope.ts', [
  'getSpaceProjects',
  'getSpaceTree',
  'spaceSyncStatus',
  'syncSpaces'
])
const dictionaryModule = await load('../hooks/archive/useDictionaries.ts', ['getDictionaryTypes', 'getDictionaryItems'])
const houseModule = await load('../hooks/archive/useHouseEditor.ts', ['getHouse', 'saveHouse'])
const customerDetailModule = await load('../hooks/archive/useCustomerDetail.ts', [
  'getCustomer',
  'saveCustomer',
  'deleteCustomer',
  'deleteRelationship',
  'endRelationship'
])
const customerLinkModule = await load('../hooks/archive/useCustomerLink.ts', [
  'getSpaceTree',
  'getHouse',
  'addRelationship'
])
const excelModule = await load('../hooks/archive/useArchiveExcel.ts', [
  'getArchiveTemplate',
  'exportCustomers',
  'exportHouses',
  'importCustomers',
  'importHouses',
  'getDictionaryItems',
  'getDictionaryTypes',
  'checked',
  'queryHouses',
  'queryPropertyUsers'
])
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
function deferred() {
  let resolve
  const promise = new Promise((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function mount(create, api = {}) {
  globalThis.__archiveApi = api
  globalThis.__archiveMessages = []
  let state
  const renderer = createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    patchProp() {},
    parentNode: () => null,
    nextSibling: () => null
  })
  const app = renderer.createApp(
    defineComponent({
      setup() {
        state = create()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
test('客户请求展示业务响应，HTTP或网络异常无业务提示时使用页面文案', () => {
  const transport = Object.assign(new Error('Network Error'), { isAxiosError: true })
  assert.equal(errors.requestErrorMessage(transport, '保存失败，请重试'), '保存失败，请重试')
  assert.equal(
    errors.requestErrorMessage(
      { response: { data: { message: '该用户在当前项目已建档，请关联已有客户' } } },
      '保存失败'
    ),
    '该用户在当前项目已建档，请关联已有客户'
  )
  assert.equal(errors.requestErrorMessage(new Error('请选择客户'), '保存失败'), '请选择客户')
})

test('客户列表编辑读取最新资料，业务错误显示后端中文，关闭后旧响应不重开编辑', async () => {
  const late = deferred()
  const row = { id: 'client', customerType: 'person', name: '姓名', telephone: '123', version: 2, relationships: [] }
  const { state, unmount } = mount(() => customerDetailModule.useCustomerDetail({ projectId: 'project' }, () => {}), {
    getCustomer: async (_scope, id) => (id === 'late' ? late.promise : row),
    saveCustomer: async () => {
      throw Object.assign(new Error('Request failed with status code 409'), {
        isAxiosError: true,
        response: { data: { message: '资料已变化，请刷新后重试' } }
      })
    }
  })
  await state.select('client', undefined, 'edit')
  assert.equal(state.editing.value, true)
  assert.equal(state.profile.name, '姓名')
  await state.save()
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: '资料已变化，请刷新后重试', type: 'error' })
  const pending = state.select('late', undefined, 'edit')
  state.close()
  late.resolve({ ...row, id: 'late' })
  await pending
  assert.equal(state.open.value, false)
  assert.equal(state.editing.value, false)
  unmount()
})

test('客户列表删除携带版本并刷新，有效关联和历史客户不发删除请求', async () => {
  const deleted = []
  let reloads = 0
  const row = { id: 'client', customerType: 'person', name: '姓名', telephone: '123', version: 2, relationships: [] }
  const { state, unmount } = mount(
    () => customerDetailModule.useCustomerDetail({ projectId: 'project' }, () => reloads++),
    {
      getCustomer: async () => row,
      deleteCustomer: async (scope, value) => deleted.push({ scope, value })
    }
  )
  await state.removeCustomer({ ...row, relationships: [{ id: 'active' }] })
  assert.equal(deleted.length, 0)
  await state.removeCustomer(row)
  assert.equal(deleted.length, 1)
  assert.equal(deleted[0].value.version, 2)
  assert.equal(deleted[0].scope.projectId, 'project')
  assert.equal(reloads, 1)
  await state.select('client', { id: 'history', customer: row })
  state.edit()
  await state.removeCustomer(row)
  assert.equal(state.editing.value, false)
  assert.equal(deleted.length, 1)
  unmount()
})

test('结束关联后的客户可在编辑中新增关联，保留未保存的资料，详情与历史只读', async (t) => {
  const row = {
    id: 'client',
    projectId: 'project',
    customerType: 'person',
    name: '姓名',
    telephone: '123',
    version: 2,
    relationships: []
  }
  let reloads = 0
  const { state, unmount } = mount(
    () => customerDetailModule.useCustomerDetail({ projectId: 'project' }, () => reloads++),
    {
      getCustomer: async () => row
    }
  )
  t.after(unmount)
  await state.select('client')
  state.beginLink()
  assert.equal(state.linking.value, false)
  await state.select('client', undefined, 'edit')
  state.profile.name = '尚未保存的姓名'
  state.beginLink()
  assert.equal(state.linking.value, true)
  const relation = { id: 'new-relation', projectId: 'project', customerId: 'client', spaceId: '101', startTime: 5000 }
  state.linked(relation)
  assert.equal(state.customer.value.relationships[0].id, 'new-relation')
  assert.equal(state.profile.name, '尚未保存的姓名')
  assert.equal(state.linking.value, false)
  assert.equal(reloads, 1)
  await state.select('client', { id: 'old', customer: row })
  state.beginLink()
  state.linked(relation)
  assert.equal(state.linking.value, false)
  assert.equal(reloads, 1)
})

test('重新关联复用客户主档，加入家庭只提交新关系，失败保留输入且防止重复保存', async (t) => {
  const submissions = []
  const done = []
  let reject = true
  const pending = deferred()
  const customer = { id: 'client', customerType: 'person', name: '原客户', relationships: [{ spaceId: '102' }] }
  const { state, unmount } = mount(
    () =>
      customerLinkModule.useCustomerLink({ projectId: 'project', spaceId: '101' }, customer, (value) =>
        done.push(value)
      ),
    {
      getSpaceTree: async () => [
        {
          id: 'building',
          leaf: false,
          children: [
            { id: '101', leaf: true, name: '101' },
            { id: '102', leaf: true, name: '102' }
          ]
        }
      ],
      getHouse: async () => ({ completed: true }),
      addRelationship: async (...args) => {
        submissions.push(args)
        if (reject) throw { response: { data: { message: '该家庭已结束，请重新选择' } } }
        return pending.promise
      }
    }
  )
  t.after(unmount)
  await settle()
  assert.deepEqual(
    state.spaces.value.map((item) => item.id),
    ['101']
  )
  assert.equal(state.ready.value, true)
  Object.assign(state.relation, {
    nature: 'tenant',
    familyMode: 'existing',
    familyId: 'active-family',
    startTime: 5000
  })
  await state.save()
  assert.equal(state.relation.familyId, 'active-family')
  assert.equal(done.length, 0)
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: '该家庭已结束，请重新选择', type: 'error' })
  reject = false
  const saving = state.save()
  await state.save()
  assert.equal(submissions.length, 2)
  pending.resolve({ id: 'new-relation' })
  await saving
  assert.equal(done[0].id, 'new-relation')
  assert.deepEqual(submissions[1], [
    { projectId: 'project', spaceId: '101' },
    'client',
    {
      spaceId: '101',
      nature: 'tenant',
      familyMode: 'existing',
      familyId: 'active-family',
      startTime: 5000
    }
  ])
})

test('切换房屋清空家庭，忽略旧房屋响应，未完善房屋不能提交关联', async (t) => {
  const oldHouse = deferred()
  let posts = 0
  const { state, unmount } = mount(
    () =>
      customerLinkModule.useCustomerLink(
        { projectId: 'project' },
        { id: 'client', customerType: 'person', relationships: [] },
        () => {}
      ),
    {
      getSpaceTree: async () => [
        { id: '101', leaf: true },
        { id: '102', leaf: true }
      ],
      getHouse: async (_scope, id) => (id === '101' ? oldHouse.promise : { completed: false }),
      addRelationship: async () => posts++
    }
  )
  t.after(unmount)
  await settle()
  const first = state.selectSpace('101')
  Object.assign(state.relation, { familyId: 'old-family', familyName: '旧家庭', familyMode: 'existing' })
  await state.selectSpace('102')
  oldHouse.resolve({ completed: true })
  await first
  assert.equal(state.relation.spaceId, '102')
  assert.equal(state.relation.familyId, undefined)
  assert.equal(state.relation.familyName, undefined)
  assert.equal(state.relation.familyMode, 'new')
  assert.equal(state.ready.value, false)
  await state.save()
  assert.equal(posts, 0)
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: 'Archive.completeFirst', type: 'error' })
})

test('只读客户详情不能结束或删除关联，编辑中结束失败保留弹窗并用消息提示', async () => {
  const relation = { id: 'relation', version: 3, startTime: 1000 }
  const row = {
    id: 'client',
    customerType: 'person',
    name: '姓名',
    telephone: '123',
    version: 2,
    relationships: [relation]
  }
  const calls = []
  let rejected = true
  const { state, unmount } = mount(() => customerDetailModule.useCustomerDetail({ projectId: 'project' }, () => {}), {
    getCustomer: async () => row,
    saveCustomer: async () => calls.push('saved'),
    deleteRelationship: async () => calls.push('deleted'),
    endRelationship: async (...args) => {
      calls.push(args)
      if (rejected) throw { response: { data: { message: '关联已变化，请重试' } } }
    }
  })
  await state.select('client')
  await state.save()
  state.beginEnd(relation)
  await state.removeRelation(relation)
  assert.equal(state.ending.value, undefined)
  assert.equal(calls.length, 0)
  await state.select('client', undefined, 'edit')
  state.beginEnd(relation)
  state.endTime.value = 2000
  state.endReason.value = ' 搬离 '
  await state.end()
  assert.equal(state.ending.value.id, 'relation')
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: '关联已变化，请重试', type: 'error' })
  rejected = false
  await state.end()
  assert.equal(state.ending.value, undefined)
  assert.equal(state.editing.value, true)
  assert.equal(calls[1][2], 2000)
  assert.equal(calls[1][3], '搬离')
  await state.save()
  assert.equal(calls[2], 'saved')
  assert.equal(state.open.value, false)
  unmount()
})

test('企业档案剔除切换类型前残留的个人证件、性质与家庭', () => {
  const result = customer.createPayload(
    '00001',
    'company',
    {
      name: ' Test ',
      telephone: ' 00123 ',
      certificateType: 'id',
      certificateNumber: '123',
      legalRepresentative: 'Alice'
    },
    { spaceId: '00002', nature: 'owner', familyMode: 'new', familyName: 'Hidden', startTime: 12 }
  )
  assert.equal(result.userId, '00001')
  assert.equal(result.name, 'Test')
  assert.equal(result.legalRepresentative, 'Alice')
  assert.equal('certificateType' in result, false)
  assert.equal('nature' in result, false)
  assert.equal('familyMode' in result, false)
})
test('选择已有家庭时不携带上一次新建家庭的名称', () => {
  const result = customer.relationshipPayload(
    { spaceId: 'house', nature: 'family', familyMode: 'existing', familyName: 'Old', familyId: '001', startTime: 4 },
    'person'
  )
  assert.equal(result.familyId, '001')
  assert.equal('familyName' in result, false)
})
test('历史筛选递归映射主档字段但保留关系性质与逻辑，排序使用同一契约', () => {
  const query = {
    terms: [
      {
        terms: [
          { column: 'name', termType: 'like', value: '%A%' },
          { column: 'telephone', termType: 'eq', value: '001', type: 'or' }
        ],
        type: 'and'
      },
      { column: 'nature', termType: 'eq', value: 'tenant' }
    ],
    sorts: [{ name: 'customerType', order: 'asc' }]
  }
  const result = history.historyQuery(query)
  assert.equal(result.terms[0].terms[0].column, 'customer.name')
  assert.equal(result.terms[0].terms[1].column, 'customer.telephone')
  assert.equal(result.terms[0].terms[1].type, 'or')
  assert.equal(result.terms[1].column, 'nature')
  assert.equal(result.sorts[0].name, 'customer.customerType')
  assert.equal(query.terms[0].terms[0].column, 'name')
})
test('权限裁剪导致无可见子项时仍遵守来源leaf=false', () => {
  const result = scopeModule.filterSpaces(
    [{ id: 'building', name: 'Building', version: 0, leaf: false, children: [] }],
    ''
  )
  assert.equal(result[0].leaf, false)
})
test('切换项目后忽略旧空间树，不能把上个项目房屋带进新范围', async () => {
  const old = deferred()
  const { state, unmount } = mount(scopeModule.useArchiveScope, {
    getSpaceProjects: async () => [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' }
    ],
    getSpaceTree: (id) =>
      id === 'a' ? old.promise : Promise.resolve([{ id: 'b-house', name: 'B house', leaf: true, version: 0 }]),
    spaceSyncStatus: async () => ({ running: false })
  })
  await settle()
  state.projectId.value = 'b'
  await settle()
  old.resolve([{ id: 'a-house', name: 'A house', leaf: true, version: 0 }])
  await settle()
  assert.equal(state.tree.value[0].id, 'b-house')
  assert.equal(state.selectedId.value, undefined)
  unmount()
})
test('字典分类停用后不可新增选择，旧记录仍可解析原文或原编码', async () => {
  const { state, unmount } = mount(dictionaryModule.useDictionaries, {
    getDictionaryTypes: async () => [{ id: 'type', code: 'house-type', enabled: false }],
    getDictionaryItems: async () => [{ id: 'item', value: '01', text: 'Old type', enabled: true }]
  })
  await settle()
  assert.deepEqual(state.options('house-type'), [])
  assert.equal(state.options('house-type', '01')[0].disabled, true)
  assert.equal(state.text('house-type', '01'), 'Old type')
  assert.equal(state.text('house-type', 'unknown'), 'unknown')
  unmount()
})
test('详情关闭后房屋保存旧响应不重开抽屉或刷新已离开的范围', async () => {
  const pending = deferred()
  let reloads = 0
  const { state, unmount } = mount(() => houseModule.useHouseEditor({ projectId: 'p' }, () => reloads++), {
    getHouse: async (id) => ({ id, spaceId: 'h', name: 'House', version: 2 }),
    saveHouse: () => pending.promise
  })
  await state.select('h')
  const saving = state.save({ houseType: 'type', houseState: 'state', billingArea: 12 })
  state.close()
  pending.resolve({ spaceId: 'h', name: 'House', version: 3 })
  await saving
  assert.equal(state.open.value, false)
  assert.equal(state.house.value, undefined)
  assert.equal(reloads, 0)
  unmount()
})
test('查询房屋详情的只读模式不能触发保存', async () => {
  let writes = 0
  const { state, unmount } = mount(() => houseModule.useHouseEditor({ projectId: 'p' }, () => {}), {
    getHouse: async () => ({ spaceId: 'h', name: 'House', version: 1 }),
    saveHouse: async () => {
      writes++
      return {}
    }
  })
  await state.select('h', true)
  await state.save({ houseType: 'type', houseState: 'state', billingArea: 1 })
  assert.equal(state.readOnly.value, true)
  assert.equal(writes, 0)
  unmount()
})
test('根空间兼容NON_NULL省略parentId但排除非根，解绑显式传null与版本', async () => {
  const calls = []
  const { state, unmount } = mount(() => organizationSpaces.useOrganizationSpaces(() => 'org'), {
    getSpaceRoots: async () => [
      { id: 'omitted', name: 'Root', version: 4 },
      { id: 'null', name: 'Root null', parentId: null, version: 2 },
      { id: 'child', name: 'Child', parentId: 'omitted', version: 1 }
    ],
    bindSpaceRoot: async (...args) => {
      calls.push(args)
      return {}
    }
  })
  await settle()
  assert.deepEqual(
    state.options.value.map((item) => item.value),
    ['omitted', 'null']
  )
  await state.save({ id: 'omitted', version: 4 }, true)
  assert.deepEqual(calls, [['omitted', null, 4]])
  unmount()
})
test('组织已关联时不能追加第二个根，显式解除后才可关联新根', async () => {
  const rows = [
    { id: 'first', name: 'First', version: 2, organizationId: 'org' },
    { id: 'second', name: 'Second', version: 0 }
  ]
  const writes = []
  const { state, unmount } = mount(() => organizationSpaces.useOrganizationSpaces(() => 'org'), {
    getSpaceRoots: async () => rows.map((row) => ({ ...row })),
    bindSpaceRoot: async (id, organizationId, version) => {
      writes.push([id, organizationId, version])
      Object.assign(
        rows.find((row) => row.id === id),
        { organizationId, version: version + 1 }
      )
    }
  })
  await settle()
  state.openEditor()
  state.selected.value = 'second'
  await state.bind()
  assert.equal(writes.length, 0)
  assert.equal(state.bound.value.length, 1)
  await state.save(state.bound.value[0], true)
  assert.equal(state.editing.value, true)
  state.selected.value = 'second'
  await state.bind()
  assert.deepEqual(writes, [
    ['first', null, 2],
    ['second', 'org', 0]
  ])
  assert.equal(state.bound.value[0].id, 'second')
  assert.equal(state.editing.value, false)
  unmount()
})

test('关联冲突不覆盖原关联，查看空间树使用当前根且失败可重试', async () => {
  let attempts = 0
  const { state, unmount } = mount(() => organizationSpaces.useOrganizationSpaces(() => 'org'), {
    getSpaceRoots: async () => [{ id: 'first', name: 'First', version: 2, organizationId: 'org' }],
    bindSpaceRoot: async () => {
      throw new Error('Conflict')
    },
    getSpaceRootTree: async (rootId) => {
      assert.equal(rootId, 'first')
      if (++attempts === 1) throw new Error('Unavailable')
      return [{ id: rootId, name: 'First', children: [{ id: 'room', name: '101' }] }]
    }
  })
  await settle()
  state.openEditor()
  await state.save(state.bound.value[0], true)
  assert.equal(state.bound.value[0].id, 'first')
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: 'Conflict', type: 'error' })
  assert.equal(state.editing.value, true)
  await state.preview()
  assert.equal(state.treeFailed.value, true)
  await state.preview()
  assert.equal(state.treeFailed.value, false)
  assert.equal(state.tree.value[0].children[0].id, 'room')
  unmount()
})

test('Excel文件格式与10MB限制有效，拒绝CSV与超限文件', () => {
  assert.equal(importValues.validateImportFile({ name: '模板.XLSX', size: 10 * 1024 * 1024 }), undefined)
  assert.equal(importValues.validateImportFile({ name: '模板.xls', size: 1 }), undefined)
  assert.equal(importValues.validateImportFile({ name: '模板.csv', size: 1 }), 'format')
  assert.equal(importValues.validateImportFile({ name: '模板.xlsx', size: 10 * 1024 * 1024 + 1 }), 'size')
})
test('房屋保存冲突保留输入窗口并使用后端中文消息', async () => {
  const { state, unmount } = mount(() => houseModule.useHouseEditor({ projectId: 'project' }, () => {}), {
    getHouse: async () => ({ spaceId: '101', name: '101', version: 1 }),
    saveHouse: async () => {
      throw { response: { data: { message: '资料已变化，请刷新后重试' } } }
    }
  })
  await state.select('101')
  await state.save({ billingArea: 100 })
  assert.equal(state.open.value, true)
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: '资料已变化，请刷新后重试', type: 'error' })
  unmount()
})

test('后端文件导入保留原文件和外部项目，行号错误只弹消息且不刷新', async () => {
  const calls = []
  let imported = 0
  const file = {
    name: '客户.xlsx',
    size: 128,
    arrayBuffer: () => {
      throw new Error('前端不应解析 Excel')
    }
  }
  const api = {
    importHouses: async (...args) => {
      calls.push(args)
      return { count: 2 }
    }
  }
  const { state, unmount } = mount(
    () =>
      excelModule.useArchiveExcel(
        () => ({ kind: 'house', scope: { projectId: 'p1', spaceId: 'subtree' }, query: {} }),
        () => imported++
      ),
    api
  )
  assert.equal(await state.upload(file), true)
  assert.deepEqual(calls[0], [{ projectId: 'p1' }, file])
  assert.equal(imported, 1)
  api.importHouses = async () => {
    throw { response: { data: { message: '第3行：房屋类型无效' } } }
  }
  assert.equal(await state.upload(file), false)
  assert.deepEqual(globalThis.__archiveMessages.at(-1), { message: '第3行：房屋类型无效', type: 'error' })
  assert.equal(imported, 1)
  assert.equal('error' in state, false)
  assert.equal(state.busy.value, false)
  unmount()
})

const files = await load('../utils/archiveFiles.ts')
test('客户下载与导入必须选择类型，类型传给后端且缺失时不发请求', async (t) => {
  const calls = []
  const { state, unmount } = mount(
    () =>
      excelModule.useArchiveExcel(
        () => ({ kind: 'customer', scope: { projectId: 'project' }, query: {} }),
        () => {}
      ),
    {
      getArchiveTemplate: async (...args) => {
        calls.push(args)
        throw new Error('download test')
      },
      importCustomers: async (...args) => {
        calls.push(args)
        return { count: 1 }
      }
    }
  )
  t.after(unmount)
  await state.template()
  assert.equal(await state.upload({ name: '客户.xlsx', size: 1 }), false)
  assert.equal(calls.length, 0)
  assert.equal(globalThis.__archiveMessages.at(-1).message, 'Archive.importTypeRequired')
  await state.template('company')
  assert.deepEqual(calls[0], [{ projectId: 'project' }, 'customer', 'company'])
  const file = { name: '个人.xlsx', size: 1 }
  assert.equal(await state.upload(file, 'person'), true)
  assert.deepEqual(calls[1], [{ projectId: 'project' }, file, 'person'])
})
test('下载失败的JSON Blob保留后端业务消息，不能当成Excel下载', async () => {
  const blob = new Blob([JSON.stringify({ message: '当前项目无权访问' })], { type: 'application/json' })
  await assert.rejects(files.excelResponse(blob), /当前项目无权访问/)
  assert.equal(await files.excelErrorMessage({ response: { data: blob } }, '下载失败'), '当前项目无权访问')
  const excelBlob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  assert.equal(await files.excelResponse(excelBlob), excelBlob)
  assert.equal(await files.excelErrorMessage({ response: { data: new Blob(['bad']) } }, '下载失败'), '下载失败')
})
