import {test} from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,nextTick} from 'vue'
import {useRoomData,useRoomPage} from '../src/hooks/useRoomData'
import {roomsState,resetRooms,selectRoom} from '../src/services/rooms'
import {state} from '../src/services/session'
import {months,subtract,cents} from '../src/services/format'
import type {Room} from '../src/types'
const room=(id:string):Room=>({projectId:'project',projectName:'项目',spaceId:id,name:id,fullName:'项目/'+id,customerName:'住户',nature:'owner'})
const storage=new Map<string,string>()
Object.assign(globalThis,{sessionStorage:{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)}})
const flush=async()=>{await nextTick();await Promise.resolve();await nextTick()}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return {resolve,promise}}
test('季度月份不出现不足一季度的档位；优惠用分运算避免浮点误差',()=>{
 assert.deepEqual(months('QUARTERLY'),[3,6,9,12]);assert.equal(months('MONTHLY').length,12)
 assert.equal(subtract('700.00','600.00'),'100.00');assert.equal(subtract('0.30','0.10'),'0.20');assert.equal(cents('12.5'),1250n)
})
test('换房立即清除旧金额，迟到的房屋请求不能覆盖当前结果',async()=>{
 resetRooms();const first=deferred<string>(),second=deferred<string>(),scope=effectScope()
 let vm!:ReturnType<typeof useRoomData<string>>
 scope.run(()=>vm=useRoomData(r=>r.spaceId==='one'?first.promise:second.promise))
 selectRoom(room('one'));await flush();assert.equal(vm.loading.value,true)
 selectRoom(room('two'));await flush();assert.equal(vm.data.value,undefined)
 second.resolve('第二套房');await flush();assert.equal(vm.data.value,'第二套房')
 first.resolve('第一套房');await flush();assert.equal(vm.data.value,'第二套房');scope.stop();resetRooms()
})
test('当前房屋请求失败不残留旧金额，刷新可恢复',async()=>{
 resetRooms();let fail=false;const scope=effectScope();let vm!:ReturnType<typeof useRoomData<string>>
 scope.run(()=>vm=useRoomData(async r=>{if(fail)throw Error('暂不可用');return r.spaceId}))
 selectRoom(room('one'));await flush();assert.equal(vm.data.value,'one')
 fail=true;selectRoom(room('two'));await flush();assert.equal(vm.data.value,undefined);assert.equal(vm.error.value,'暂不可用')
 fail=false;await vm.refresh();assert.equal(vm.data.value,'two');assert.equal(vm.error.value,'');scope.stop();resetRooms()
})
test('加载更多失败后重试同一页，不跳页；重选房屋从第一页开始',async()=>{
 resetRooms();const calls:string[]=[];let fail=true;const scope=effectScope();let vm!:ReturnType<typeof useRoomPage<string>>
 scope.run(()=>vm=useRoomPage(async(r,p)=>{calls.push(r.spaceId+':'+p);if(p===1&&fail)throw Error('失败');return {data:[r.spaceId+':'+p],total:3,pageIndex:p,pageSize:1}}))
 selectRoom(room('one'));await flush();await vm.load();assert.equal(vm.rows.value.length,1)
 fail=false;await vm.load();assert.deepEqual(vm.rows.value,['one:0','one:1'])
 selectRoom(room('two'));await flush();assert.deepEqual(vm.rows.value,['two:0']);assert.deepEqual(calls,['one:0','one:1','one:1','two:0']);scope.stop();resetRooms()
})
test('房屋选择按账号与应用隔离保存，退出清理内存关联',()=>{
 state.session={token:'fixture',tenantDomain:'project',applicationId:'app'};state.authorization={user:{id:'owner'},permissions:[]}
 selectRoom(room('two'));assert.equal(storage.get('finance-owner:room:project:app:owner'),'project:two')
 resetRooms();assert.equal(roomsState.selected,undefined);assert.equal(roomsState.rooms.length,0)
 state.session=undefined;state.authorization=undefined
})


test('多项房屋费用全部参与试算；活动仅应用实际配置项，季度月份共同约束',async()=>{
 const {inputs}=await import('../src/services/prepay')
 const settings=[{id:'monthly',settlementMethod:'MONTHLY',activities:[{id:'offer',name:'充6赠1',endDate:'2027-01-01',tiers:[{paidMonths:6,giftMonths:1}]}]},{id:'quarter',settlementMethod:'QUARTERLY',activities:[]}]
 assert.deepEqual(inputs(settings,{paidMonths:6,giftMonths:1},'offer'),[{settingId:'monthly',activityId:'offer',paidMonths:6,giftMonths:1},{settingId:'quarter',activityId:undefined,paidMonths:6,giftMonths:0}])
 assert.throws(()=>inputs(settings,{paidMonths:1,giftMonths:0}),/不支持/)
 assert.throws(()=>inputs(settings,{paidMonths:6,giftMonths:1},'expired'),/活动已变化/)
 assert.throws(()=>inputs([], {paidMonths:6,giftMonths:0}),/联系物业/)
})

test('多份服务端报价按分合计，保留不同账期、取最早过期时间，不接受不同房屋报价',async()=>{
 const {combine}=await import('../src/services/prepay')
 const dates=Array.from({length:7},(_,index)=>{const d=new Date(Date.UTC(2026,11+index,1));return {start:d.toISOString().slice(0,10),end:new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10)}})
 const q={id:'a',status:'OPEN',expiresAt:2000,businessDate:'2026-11-07',houseName:'项目/101',payerName:'住户',payAmount:'1200.00',originalAmount:'1400.00',lines:dates.map((date,index)=>({type:'FUTURE',...date,originalAmount:'200.00',paidAmount:index===6?'171.42':'171.43',discountAmount:index===6?'28.58':'28.57'}))}
 const b={...q,id:'b',expiresAt:1000,payAmount:'650.00',originalAmount:'650.00',lines:[...dates.slice(0,6).map(date=>({type:'FUTURE',...date,originalAmount:'100.00',paidAmount:'100.00',discountAmount:'0.00'})),{type:'ARREARS',start:'2026-11-01',end:'2026-11-30',originalAmount:'50.00',paidAmount:'50.00',discountAmount:'0.00'}]}
 const result=combine([q,b]);assert.equal(result.payAmount,'1850.00');assert.equal(result.originalAmount,'2050.00');assert.equal(result.expiresAt,1000)
 assert.equal(result.lines.length,8);assert.equal(result.lines[0].type,'ARREARS')
 assert.deepEqual(result.lines[1],{type:'FUTURE',start:'2026-12-01',end:'2026-12-31',originalAmount:'300.00',paidAmount:'271.43',discountAmount:'28.57'})
 assert.equal(result.lines[7].paidAmount,'171.42');assert.equal(result.lines.reduce((sum,line)=>sum+cents(line.paidAmount),0n),185000n)
 assert.equal(result.lines.reduce((sum,line)=>sum+cents(line.discountAmount),0n),20000n)
 assert.throws(()=>combine([q,{...b,houseName:'项目/102'}]),/房屋费用已变化/)
 assert.throws(()=>combine([]),/暂无有效费用/)
})


test('收支明细显示服务端真实动作，收入和支出金额保留正负号',async()=>{
 const {entryAction,signedMoney}=await import('../src/services/format')
 assert.equal(entryAction('TOPUP'),'费用预存');assert.equal(entryAction('REVOKE_TOPUP'),'预存撤销')
 assert.equal(entryAction('TRANSFER_OUT'),'转出');assert.equal(signedMoney('3.21'),'+3.21')
 assert.equal(signedMoney('-10.01'),'−10.01');assert.equal(signedMoney('0.00'),'0.00');assert.equal(signedMoney('1200.10'),'+1,200.10')
})
