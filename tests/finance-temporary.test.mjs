import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
const require = createRequire(import.meta.url)
const apiNames = ['previewTemporary', 'collectTemporary', 'getTemporaryOptions', 'getTemporaryHouse']
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../hooks/finance-temporary/useTemporaryEditor.ts', import.meta.url))],
  outdir: 'out',
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['vue'],
  plugins: [
    {
      name: 'boundaries',
      setup(builder) {
        builder.onResolve({ filter: /api\/financeTemporary|@jetlinks-web\/utils|vue-i18n|useTemporaryRecovery/ }, (args) => ({
          path: args.path,
          namespace: 'mock'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
          contents: args.path.includes('financeTemporary')
            ? apiNames.map((name) => `export const ${name}=(...a)=>globalThis.__temporaryApi.${name}(...a)`).join('\n')
            : args.path.includes('useTemporaryRecovery')
              ? 'export const useTemporaryRecovery=()=>globalThis.__temporaryRecovery'
              : args.path === 'vue-i18n'
                ? 'export const useI18n=()=>({t:key=>key})'
                : 'export const onlyMessage=(...a)=>globalThis.__temporaryMessages.push(a)'
        }))
      }
    }
  ]
})
const modules = compiled.outputFiles.map((file) => {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', file.text)(require, m, m.exports)
  return m.exports
})
const { useTemporaryEditor } = modules[0]
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
function mount(factory, api = {}) {
  globalThis.__temporaryMessages = []
  globalThis.__temporaryApi = {
    getTemporaryOptions: async () => ({projectSubjects: [], standards: [{id:'standard', companyId:'company', standardName:'清洁费'}], companies: [{id:'company', name:'物业公司', funding:[{id:'cash', method:'1', text:'现金'},{id:'bank',method:'3', recordedId:'bank',text:'转账'}]}]}),
    getTemporaryHouse: async (_p,id) => ({house:{spaceId:id,fullName:'园区/101'},customers:[{relationshipId:'link',customerId:'customer',name:'龚超'}]}),
    previewTemporary: async (_p,input) => ({token:'fresh',total:input.amount,fullName:'园区/101',customerName:'龚超',standardName:'清洁费',funding:[]}),
    collectTemporary: async () => ({payment:{id:'receipt',amount:'10.01'},lines:[]}),
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
        state = factory()
        return () => h('div')
      }
    })
  )
  app.mount({})
  return { state, unmount: () => app.unmount() }
}

function storage() {
 let pending
 return {read:()=>pending,write:v=>{pending=structuredClone(v)},clear:()=>{pending=undefined}}
}
async function editor(api={}, store=storage()) {
 globalThis.__temporaryRecovery=store
 const view=mount(()=>useTemporaryEditor({projectId:'project'},()=>{}),api)
 await flush()
 await view.state.pick('room')
 Object.assign(view.state.model,{relationshipId:'link',standardId:'standard',amount:'9007199254740993.01',tenders:[{optionId:'cash',amount:'9007199254740993.01'}]})
 await flush()
 return {...view,store}
}
test('临时收款冻结准确金额、客户和期间，多方式总额不平衡不预览', async()=>{
 const requests=[]
 const {state,unmount}=await editor({previewTemporary:async(_p,input)=>{requests.push(input);return {token:'ok',total:input.amount,funding:[]}}})
 await state.calculate()
 assert.equal(requests[0].amount,'9007199254740993.01')
 assert.equal(requests[0].relationshipId,'link')
 assert.match(requests[0].accountPeriod,/^\d{4}-\d{2}$/)
 assert.equal(requests[0].items,undefined)
 state.model.tenders[0].amount='1.00'
 await flush()
 await state.calculate()
 assert.equal(requests.length,1)
 assert.equal(state.confirmation.preview.value,undefined)
 unmount()
})
test('切换房屋马上清除旧客户，迟到详情不能覆盖新房屋',async()=>{
 const pending={}
 const {state,unmount}=await editor({getTemporaryHouse:(_p,id)=>id==='room'?Promise.resolve({house:{spaceId:id},customers:[]}):new Promise(r=>pending[id]=r)})
 state.model.relationshipId='old'
 const first=state.pick('first'),last=state.pick('last')
 assert.equal(state.model.relationshipId,'')
 pending.last({house:{spaceId:'last'},customers:[{relationshipId:'new',name:'新客户'}]})
 await last
 pending.first({house:{spaceId:'first'},customers:[{relationshipId:'old',name:'旧客户'}]})
 await first
 assert.equal(state.house.value.house.spaceId,'last')
 assert.equal(state.model.spaceId,'last')
 unmount()
})
test('网络未知重新挂载恢复同一请求，403不能丢弃原单',async()=>{
 const calls=[]
 const store=storage()
 let current=await editor({collectTemporary:async(_p,r)=>{calls.push(structuredClone(r));throw Error('network')}},store)
 await current.state.calculate();await current.state.confirmation.submit()
 assert.equal(current.state.confirmation.uncertain.value,true)
 current.unmount()
 globalThis.__temporaryRecovery=store
 current=mount(()=>useTemporaryEditor({projectId:'project'},()=>{}),{collectTemporary:async(_p,r)=>{calls.push(structuredClone(r));if(calls.length===2)throw {response:{status:403}};return {payment:{id:'original'},lines:[]}}})
 await flush()
 assert.equal(current.state.confirmation.uncertain.value,true)
 await current.state.confirmation.submit()
 assert.ok(current.state.confirmation.preview.value)
 await current.state.confirmation.submit()
 assert.equal(current.state.confirmation.result.value.payment.id,'original')
 assert.equal(calls[0].requestId,calls[2].requestId)
 assert.deepEqual(calls[0].input,calls[2].input)
 assert.equal(store.read(),undefined)
 current.unmount()
})
test('首次409保持编辑数据并要求重预览，存储不可写不发送',async()=>{
 let count=0
 const {state,store,unmount}=await editor({collectTemporary:async()=>{count++;throw {response:{status:409}}}})
 await state.calculate();await state.confirmation.submit()
 assert.equal(state.confirmation.preview.value,undefined)
 assert.equal(state.model.amount,'9007199254740993.01')
 assert.equal(store.read(),undefined)
 await state.calculate()
 store.write=()=>{throw Error('full')}
 await state.confirmation.submit()
 assert.equal(count,1)
 assert.equal(state.confirmation.saving.value,false)
 unmount()
})
test('更换公司清空不适用标准与支付方式，上传失败阻止预览',async()=>{
 let count=0
 const {state,unmount}=await editor({previewTemporary:async()=>{count++;return {token:'ok'}}})
 state.model.companyId='other'
 await flush()
 assert.equal(state.model.standardId,'')
 assert.deepEqual(state.model.tenders,[])
 state.filesChanged({fileList:[{uid:'bad',name:'bad.jpg',status:'error'}]})
 await state.calculate()
 assert.equal(count,0)
 unmount()
})
