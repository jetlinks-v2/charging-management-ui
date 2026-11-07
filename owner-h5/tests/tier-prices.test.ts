import {test} from 'node:test'
import assert from 'node:assert/strict'
import {computed,effectScope,nextTick,shallowRef} from 'vue'
import {useTierPrices} from '../src/hooks/useTierPrices'
import type {PriceSource} from '../src/hooks/useTierPrices'
import type {Quote,Room} from '../src/types'
const room=(id:string):Room=>({projectId:'project',projectName:'项目',spaceId:id,name:id,fullName:'项目/'+id,customerName:'住户',nature:'owner'})
const context=(id:string):PriceSource=>({room:room(id),activityId:'',settings:[{id:'fee',settlementMethod:'MONTHLY',activities:[]}],tiers:[1,2,3,4].map(paidMonths=>({paidMonths,giftMonths:0}))})
const quote=(id:string,amount='200.00'):Quote=>({id,status:'OPEN',expiresAt:Date.now()+600000,businessDate:'2026-11-07',houseName:'项目/'+id,payerName:'住户',payAmount:amount,originalAmount:amount,lines:[{type:'FUTURE',start:'2026-12-01',end:'2026-12-31',originalAmount:amount,paidAmount:amount,discountAmount:'0.00'}]})
const flush=async()=>{for(let i=0;i<12;i++){await nextTick();await Promise.resolve()}}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return {resolve,promise}}

test('月份价格自动加载，换房清除旧价，跨代请求始终最多两个，卸载后不再派发',async()=>{
 const source=shallowRef<PriceSource|undefined>(context('101')),scope=effectScope(),pending:{room:string;resolve:(value:Quote)=>void}[]=[],seen:string[]=[]
 let active=0,max=0,vm!:ReturnType<typeof useTierPrices>
 scope.run(()=>vm=useTierPrices(computed(()=>source.value),async r=>{active++;max=Math.max(max,active);seen.push(r.spaceId);const task=deferred<Quote>();pending.push({room:r.spaceId,resolve:task.resolve});try{return await task.promise}finally{active--}}))
 await flush();assert.equal(pending.length,2);assert.equal(vm.prices.value['1-0'].loading,true)
 pending.shift()!.resolve(quote('101'));await flush();assert.equal(vm.prices.value['1-0'].quote?.houseName,'项目/101')
 source.value=context('102');await flush();assert.equal(vm.prices.value['1-0'].quote,undefined);assert.equal(active,2)
 pending.splice(0).forEach(p=>p.resolve(quote(p.room)));await flush();assert.equal(max,2);assert.ok(pending.every(p=>p.room==='102'))
 pending.splice(0).forEach(p=>p.resolve(quote(p.room)));await flush();assert.equal(vm.prices.value['1-0'].quote?.houseName,'项目/102')
 const count=seen.length;scope.stop();pending.splice(0).forEach(p=>p.resolve(quote(p.room)));await flush();assert.equal(seen.length,count)
})

test('某费用失败时不返回部分金额，其他月份继续，失败档位可单独重试',async()=>{
 const ctx=context('101');ctx.tiers=ctx.tiers.slice(0,2);ctx.settings.push({id:'second',settlementMethod:'MONTHLY',activities:[]})
 const scope=effectScope(),calls:string[]=[],source=shallowRef(ctx);let failed=true,vm!:ReturnType<typeof useTierPrices>
 scope.run(()=>vm=useTierPrices(computed(()=>source.value),async(_,input)=>{calls.push(input.settingId+':'+input.paidMonths);if(input.settingId==='second'&&input.paidMonths===1&&failed)throw Error('费用配置不可用');return quote('101',input.settingId==='fee'?'200.00':'100.00')}))
 await flush();assert.equal(vm.prices.value['1-0'].quote,undefined);assert.equal(vm.prices.value['1-0'].error,'费用配置不可用');assert.equal(vm.prices.value['2-0'].quote?.payAmount,'300.00');assert.equal(vm.busy.value,false)
 failed=false;await vm.retry(ctx.tiers[0]);assert.equal(vm.prices.value['1-0'].quote?.payAmount,'300.00');assert.equal(calls.filter(c=>c.endsWith(':2')).length,2)
 source.value=undefined as unknown as PriceSource;await flush();assert.deepEqual(vm.prices.value,{});scope.stop()
})
