import {afterEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {ApiError,request} from '../src/api/http'
import {beginApplicationSwitch,discoverApplications,selectApplication} from '../src/services/applications'
import {clearSession,entryApplication,setIdentity,setSession,state} from '../src/services/session'

const storage=new Map<string,string>(),originalFetch=globalThis.fetch
const app=(id:string)=>({id,name:id}),authorization={user:{id:'owner'},permissions:[{id:'property-finance-owner',actions:['query']}]}
Object.assign(globalThis,{
 sessionStorage:{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)},
 location:{href:'http://localhost:9301/#/applications'},history:{state:null,replaceState(){}},window:new EventTarget()
})
const scopedAuthorization={subject:authorization.user,permissions:authorization.permissions}
const response=(result:unknown,status=200)=>new Response(JSON.stringify({status,result,message:status===403?'无权访问':undefined}),{status})
function identity(){setIdentity({token:'owner-token',tenantDomain:'tenant'});state.config.apiBase='/api'}
afterEach(()=>{clearSession();globalThis.fetch=originalFetch;storage.clear()})

test('入口支持普通和hash应用参数，冲突或非法ID明确拒绝',()=>{
 assert.equal(entryApplication('?applicationId=charge-a'),'charge-a')
 assert.equal(entryApplication('','#/?applicationScope=business_application:charge-b'),'charge-b')
 assert.throws(()=>entryApplication('?applicationId=a','#/?applicationId=b'),/无效/)
 assert.throws(()=>entryApplication('?applicationId=..%2Fforeign'),/无效/)
})

test('身份请求不携带应用范围，业务请求只能使用当前选中应用',async()=>{
 identity();const calls:RequestInit[]=[]
 globalThis.fetch=async(_url,init)=>{calls.push(init!);return response({})}
 await request('/business-application/me',undefined,'GET','identity')
 assert.equal((calls[0].headers as Record<string,string>)['X-Asset-Scope'],undefined)
 await assert.rejects(request('/property/finance/owner/rooms'),{status:401})
 setSession({...state.identity!,applicationId:'charge-a'},authorization,app('charge-a'))
 await request('/property/finance/owner/rooms')
 assert.equal((calls[1].headers as Record<string,string>)['X-Asset-Scope'],'business_application:charge-a')
 assert.equal(calls[1].credentials,'omit')
})

test('多个收费应用留给用户选择，非收费应用不会进入列表',async()=>{
 identity()
 globalThis.fetch=async(url,init)=>{
  const scope=(init?.headers as Record<string,string>)['X-Asset-Scope']
  if(String(url).endsWith('/business-application/me'))return response([app('a'),app('patrol'),app('b')])
  if(String(url).endsWith('/authorize/context'))return response(scope.endsWith(':patrol')?{subject:{id:'owner'},permissions:[{id:'patrol',actions:['query']}]}:scopedAuthorization)
  return response({applicationId:scope.split(':')[1]})
 }
 assert.deepEqual((await discoverApplications()).map(a=>a.id),['a','b'])
 assert.equal(state.session,undefined)
 await selectApplication('b');assert.equal(state.session?.applicationId,'b');assert.equal(state.ready,true)
})

test('唯一应用自动进入，服务端明确拒绝的应用被排除',async()=>{
 identity()
 globalThis.fetch=async(url,init)=>{
  const id=(init?.headers as Record<string,string>)['X-Asset-Scope']?.split(':')[1]
  if(String(url).endsWith('/business-application/me'))return response([app('a'),app('denied')])
  if(id==='denied')return response(null,403)
  if(String(url).endsWith('/authorize/context'))return response(scopedAuthorization)
  return response({applicationId:id})
 }
 await discoverApplications();assert.equal(state.session?.applicationId,'a')
})

test('指定无权应用不退回其他应用；不存在应用列表保留空状态',async()=>{
 identity();state.requestedApplicationId='foreign'
 globalThis.fetch=async()=>response([])
 await assert.rejects(discoverApplications(),{status:403})
 assert.equal(state.ready,false);assert.equal(state.session,undefined)
 state.requestedApplicationId=undefined
 assert.deepEqual(await discoverApplications(),[])
})

test('应用验证网络或服务错误不能被当成无权限静默忽略',async()=>{
 identity()
 globalThis.fetch=async(url)=>String(url).endsWith('/business-application/me')?response([app('a')]):response(null,503)
 await assert.rejects(discoverApplications(),{status:503});assert.equal(state.ready,false)
})

test('选中前重新验证，权限撤销或后端范围不匹配时不能进入',async()=>{
 identity();state.applications=[app('a')]
 globalThis.fetch=async()=>response(null,403)
 await assert.rejects(selectApplication('a'),{status:403})
 globalThis.fetch=async(url)=>String(url).endsWith('/authorize/context')?response(scopedAuthorization):response({applicationId:'foreign'})
 await assert.rejects(selectApplication('a'),{status:409});assert.equal(state.session,undefined)
})

test('切换立即撤销业务会话，迟到成功和401都不能污染新会话',async()=>{
 for(const status of [200,401]){
  identity();setSession({...state.identity!,applicationId:'a'},authorization,app('a'))
  let finish!:(r:Response)=>void
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve})
  const pending=request('/property/finance/owner/rooms')
  beginApplicationSwitch();assert.equal(state.ready,false);assert.equal(state.session,undefined)
  setSession({...state.identity!,applicationId:'b'},authorization,app('b'))
  finish(response([],status));await assert.rejects(pending,{status:409})
  assert.equal(state.session?.applicationId,'b');assert.equal(state.identity?.token,'owner-token')
 }
})

test('切换或退出中的应用列表响应不能恢复旧应用',async()=>{
 identity();let finish!:(r:Response)=>void
 globalThis.fetch=()=>new Promise(resolve=>{finish=resolve})
 const pending=discoverApplications();clearSession();finish(response([app('old')]))
 await assert.rejects(pending,(e:unknown)=>e instanceof ApiError&&e.status===409)
 assert.equal(state.session,undefined);assert.deepEqual(state.applications,[])
})
