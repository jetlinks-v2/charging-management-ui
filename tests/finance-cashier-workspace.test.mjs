import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, ref, computed, nextTick } from 'vue'
const require = createRequire(import.meta.url)
async function bundle(entry, mocks = false) {
  const result = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname.replace(/^\/(\w:)/, '$1')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['vue'],
    plugins: mocks
      ? [
          {
            name: 'desk-boundaries',
            setup(b) {
              b.onResolve(
                {
                  filter:
                    /api\/financeCashier|api\/financeFunds|api\/financeReceivable|useFinanceSpaceScope|vue-i18n|@jetlinks-web\/utils/
                },
                (args) => ({ path: args.path, namespace: 'mock' })
              )
              b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
                contents: args.path.includes('financeCashier')
                  ? 'export const queryCashierBills=(...a)=>globalThis.__deskApi.bills(...a)'
                  : args.path.includes('financeFunds')
                  ? 'export const queryFunds=(...a)=>globalThis.__deskApi.funds(...a)'
                  : args.path.includes('financeReceivable')
                  ? 'export const getReceivable=()=>{}; export const changeReceivable=()=>{}'
                  : args.path.includes('useFinanceSpaceScope')
                  ? 'export const useFinanceSpaceScope=()=>globalThis.__deskArchive; export const flattenSpaces=(nodes)=>nodes.flatMap(n=>[n,...flattenSpaces(n.children||[])])'
                  : args.path === 'vue-i18n'
                  ? 'export const useI18n=()=>({t:k=>k})'
                  : 'export const onlyMessage=(...a)=>globalThis.__deskMessages.push(a)'
              }))
            }
          }
        ]
      : []
  })
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports)
  return mod.exports
}
const utils = await bundle('../utils/cashierTree.ts')
const { useCashierWorkspace } = await bundle('../hooks/finance-cashier/useCashierWorkspace.ts', true)
function bill(id = 'a', extra = {}) {
  return {
    id,
    version: 1,
    spaceId: '101',
    fullName: '5G园区/1栋/101',
    customerId: 'one',
    customerIds: ['one', 'two'],
    customerName: '张三',
    customerNames: ['张三', '李四'],
    subjectId: 's',
    subjectName: '物业费',
    standardId: 'standard',
    calcStartDate: '2026-01-01',
    calcEndDate: '2026-01-31',
    arrears: '10.00',
    finalLateFeeAmount: '0.00',
    actualReceivableAmount: '10.00',
    reviewState: 'APPROVED',
    ...extra
  }
}
test('费用树按账单唯一身份分组，多收费对象不会重复费用，锁定或未审核不可选', () => {
  const a = bill(),
    b = bill('b', { frozen: true }),
    c = bill('c', { reviewState: 'PENDING' })
  const roots = utils.buildCashierTree([a, a, b, c])
  assert.equal(roots[0].amount, '30.00')
  assert.equal(roots[0].children[0].title, '张三、李四')
  const leaves = roots[0].children[0].children[0].children[0].children
  assert.equal(leaves.length, 3)
  assert.deepEqual(
    leaves.map((n) => n.disabled),
    [false, true, true]
  )
  assert.equal(utils.collectible(bill('d', { paymentOccupiedAmount: '0.01' })), false)
})
test('减免以分计算并按最大余数分配，比例四舍五入，不能超过本金或把整单收款减为零', () => {
  const rows = [bill('a', { arrears: '0.01' }), bill('b', { arrears: '0.01' }), bill('c', { arrears: '0.01' })]
  const input = { mode: 'AMOUNT', value: '0.02', reason: '测试' }
  assert.deepEqual(utils.cashierReductions(rows, input), ['0.01', '0.01', '0.00'])
  assert.deepEqual(
    utils.cashierReductions([bill('a', { arrears: '1.01' })], { ...input, mode: 'PERCENT', value: '50' }),
    ['0.51']
  )
  assert.throws(() => utils.cashierReductions([bill('a', { finalLateFeeAmount: '9.00' })], { ...input, value: '2' }))
  assert.throws(() => utils.cashierReductions(rows, { ...input, value: '0.03' }))
  assert.equal(utils.money(utils.cents('9007199254740993.01')), '9007199254740993.01')
})
function mount(api = {}) {
  globalThis.__deskMessages = []
  const selectedId = ref('101'),
    tree = ref([
      { id: '101', leaf: true, customerBound: true, name: '101', fullName: '5G园区/A组团/1栋/1单元/101' },
      { id: '102', leaf: true, customerBound: true, name: '102', fullName: '5G园区/A组团/1栋/1单元/102' }
    ])
  globalThis.__deskArchive = {
    projectId: ref('p'),
    selectedId,
    tree,
    visibleTree: tree,
    selected: computed(() => tree.value.find((n) => n.id === selectedId.value))
  }
  globalThis.__deskApi = {
    bills: async () => ({ result: { total: 1, data: [bill()] } }),
    funds: async () => ({ result: { total: 0, data: [] } }),
    ...api
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
        state = useCashierWorkspace()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}

test('非末级空间本身有客户时读取该空间余额，纯目录不读取余额', async () => {
  const calls = []
  const mounted = mount({ funds: async (_project, query) => {
    calls.push(query.terms)
    return { result: { total: 1, data: [{ id: 'fund', type: 'ADVANCE', balance: '12.00' }] } }
  } })
  mounted.state.archive.tree.value.unshift({ id: 'building', name: '1栋', leaf: false,
    customerBound: true, children: [{ id: 'child', name: '101', leaf: true, customerBound: true }] })
  mounted.state.chooseHouse('building')
  await mounted.state.reload()
  assert.deepEqual(calls.at(-1), [{ column: 'spaceId', termType: 'eq', value: 'building' }])
  assert.equal(mounted.state.balances.value.advance, '12.00')
  calls.length = 0
  mounted.state.archive.tree.value[0].customerBound = false
  await mounted.state.reload()
  assert.equal(calls.length, 0)
  mounted.unmount()
})
test('所有分页完整后才展示，缺页或重复身份不发布部分欠费', async () => {
  let requests = []
  const mounted = mount({
    bills: async (_p, q) => {
      requests.push(q.pageIndex)
      return { result: q.pageIndex === 0 ? { total: 2, data: [bill()] } : { total: 2, data: [bill('b')] } }
    }
  })
  await mounted.state.reload()
  assert.deepEqual(requests, [0, 1])
  assert.equal(mounted.state.rows.value.length, 2)
  globalThis.__deskApi.bills = async () => ({ result: { total: 2, data: [bill()] } })
  await mounted.state.reload()
  assert.equal(mounted.state.failed.value, true)
  assert.equal(mounted.state.rows.value.length, 0)
  mounted.unmount()
})
test('切换房屋清空选择与减免，迟到请求不能回填旧房屋费用', async () => {
  let resolve
  const mounted = mount({
    bills: (_p, q) =>
      q.terms[0].value.includes('101')
        ? new Promise((r) => (resolve = r))
        : Promise.resolve({ result: { total: 1, data: [bill('new', { spaceId: '102' })] } })
  })
  const old = mounted.state.reload()
  await flush()
  mounted.state.chooseHouse('102')
  await flush()
  resolve({ result: { total: 1, data: [bill('old')] } })
  await old
  assert.equal(mounted.state.rows.value[0].id, 'new')
  assert.deepEqual(mounted.state.checked.value, [])
  mounted.unmount()
})
test('客户搜索包含多收费对象快照姓名，房屋父节点通过后代空间范围筛选', async () => {
  const mounted = mount()
  mounted.state.customer.value = '李四'
  mounted.state.search()
  await flush()
  assert.equal(mounted.state.rows.value.length, 1)
  mounted.state.check(['a'])
  assert.equal(mounted.state.total.value, '10.00')
  mounted.state.reduction.value = { mode: 'AMOUNT', value: '1.01', reason: '测试' }
  assert.equal(mounted.state.actual.value, '8.99')
  mounted.unmount()
})

test('手输完整空间路径通过 fullName 查询，清除旧房屋限制，保留客户条件', async () => {
  const requests = []
  const mounted = mount({
    bills: async (_project, query) => {
      requests.push(query)
      return { result: { total: 0, data: [] } }
    }
  })
  mounted.state.house.value = ' 5G园区/A组团/1栋/1单元 '
  mounted.state.customer.value = '李四'
  mounted.state.search()
  await flush()
  assert.equal(mounted.state.archive.selectedId.value, undefined)
  assert.equal(mounted.state.house.value, '5G园区/A组团/1栋/1单元')
  assert.equal(mounted.state.appliedCustomer.value, '李四')
  assert.deepEqual(requests.at(-1).terms, [{ column: 'fullName', termType: 'like', value: '%5G园区/A组团/1栋/1单元%' }])
  assert.equal(mounted.state.scopeLabel.value, '5G园区/A组团/1栋/1单元')
  mounted.state.house.value = ''
  mounted.state.customer.value = ''
  mounted.state.search()
  assert.equal(mounted.state.hasScope.value, false)
  assert.equal(mounted.state.rows.value.length, 0)
  mounted.unmount()
})

test('点击空间树回显原 fullName，按所选空间范围查询，不显示类型标签拼接路径', async () => {
  const mounted = mount()
  mounted.state.chooseHouse('102')
  await flush()
  assert.equal(mounted.state.house.value, '5G园区/A组团/1栋/1单元/102')
  assert.equal(mounted.state.appliedHouse.value, '')
  mounted.state.search()
  assert.equal(mounted.state.archive.selectedId.value, '102')
  assert.equal(mounted.state.appliedHouse.value, '5G园区/A组团/1栋/1单元/102')
  mounted.unmount()
})
