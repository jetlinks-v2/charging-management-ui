import {computed,ref,watch,onScopeDispose} from 'vue'
import type {ComputedRef} from 'vue'
import {combine,inputs} from '../services/prepay'
import type {ProposalPart} from '../services/prepay'
import type {Room,Setting,Tier,QuoteInput,Quote} from '../types'
import {errorText} from '../api/http'

export interface PriceSource {room:Room;settings:Setting[];tiers:Tier[];activityId:string}
export interface TierPrice {loading:boolean;error:string;quote?:Quote;parts?:ProposalPart[]}
export const tierKey=(tier:Tier)=>`${tier.paidMonths}-${tier.giftMonths}`
/** 两条固定工作队列；换房/活动立即清空旧价，已发出请求最多两个，不继续派发过期任务。 */
export function useTierPrices(source:ComputedRef<PriceSource|undefined>,load:(room:Room,input:QuoteInput)=>Promise<Quote>){
 const prices=ref<Record<string,TierPrice>>({}),busy=ref(false)
 let generation=0,disposed=false,active=0
 const waiters:(()=>void)[]=[]
 async function request(room:Room,input:QuoteInput,current:()=>boolean){
  while(active>=2){await new Promise<void>(resolve=>waiters.push(resolve));if(!current())return}
  if(!current())return
  active++
  try{return await load(room,input)}finally{active--;waiters.splice(0).forEach(wake=>wake())}
 }
 async function run(selected?:Tier){
  const context=source.value
  if(disposed||!context||busy.value&&selected)return
  const version=selected?generation:++generation
  if(!selected)prices.value={}
  const pending=selected?[selected]:context.tiers
  for(const tier of pending)prices.value[tierKey(tier)]={loading:true,error:''}
  busy.value=true
  let next=0
  const current=()=>!disposed&&generation===version
  const worker=async()=>{
   while(current()&&next<pending.length){
    const tier=pending[next++],key=tierKey(tier)
    try{
     const requests=inputs(context.settings,tier,context.activityId),parts:ProposalPart[]=[]
     for(const input of requests){if(!current())return;const quote=await request(context.room,input,current);if(!current()||!quote)return;parts.push({input,quote})}
     if(current())prices.value[key]={loading:false,error:'',quote:combine(parts.map(p=>p.quote)),parts}
    }catch(e){if(current())prices.value[key]={loading:false,error:errorText(e)}}
   }
  }
  await Promise.all([worker(),worker()])
  if(current())busy.value=false
 }
 watch(source,()=>{generation++;busy.value=false;prices.value={};if(source.value)void run()},{immediate:true})
 onScopeDispose(()=>{disposed=true;generation++})
 return {prices:computed(()=>prices.value),busy,reload:()=>run(),retry:(tier:Tier)=>run(tier)}
}
