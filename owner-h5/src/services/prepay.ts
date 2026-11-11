import {computed,shallowRef,watch} from 'vue'
import {currentRoom} from './rooms'
import {state} from './session'
import {cents,months} from './format'
import type {Quote,QuoteInput,QuoteLine,Setting,Tier} from '../types'

export interface ProposalPart {input:QuoteInput;quote:Quote}
export interface Proposal {quote:Quote;parts:ProposalPart[];paidMonths:number;giftMonths:number;activityName?:string;spaceId:string;projectId:string}
export const proposal=shallowRef<Proposal>()
export const proposalCurrent=computed(()=>proposal.value&&proposal.value.spaceId===currentRoom.value?.spaceId&&proposal.value.projectId===currentRoom.value?.projectId?proposal.value:undefined)
watch([currentRoom,()=>state.session],()=>{proposal.value=undefined},{flush:'sync'})

export function amount(value:bigint){return `${value/100n}.${String(value%100n).padStart(2,'0')}`}
export function total(values:string[]){return amount(values.reduce((sum,value)=>sum+cents(value),0n))}
/** 房屋费用自动纳入；活动优惠只应用于实际配置的费用，其他费用按普通预存计算。 */
export function inputs(settings:Setting[],tier:Tier,activityId=''):QuoteInput[]{
 if(!settings.length)throw Error('当前房屋暂不能预存，请联系物业')
 if(activityId&&!settings.some(s=>s.activities.some(a=>a.id===activityId)))throw Error('活动已变化，请重新选择')
 return settings.map(setting=>{
  const activity=setting.activities.find(a=>a.id===activityId)
  if(!months(setting.settlementMethod).includes(tier.paidMonths))throw Error('当前房屋不支持这个预存月数')
  if(activity&&!activity.tiers.some(t=>t.paidMonths===tier.paidMonths&&t.giftMonths===tier.giftMonths))throw Error('活动档位已变化，请重新选择')
  return {settingId:setting.id,activityId:activity?.id,paidMonths:tier.paidMonths,giftMonths:activity?tier.giftMonths:0}
 })
}
/** 只合计服务器报价，逐期本金/优惠按分相加，不重新计算收费规则。 */
export function combine(quotes:Quote[]):Quote{
 const first=quotes[0]
 if(!first)throw Error('暂无有效费用信息')
 if(quotes.some(q=>q.houseName!==first.houseName||q.payerName!==first.payerName||q.businessDate!==first.businessDate))throw Error('房屋费用已变化，请重新选择')
 const periods=new Map<string,QuoteLine>()
 for(const quote of quotes)for(const line of quote.lines){
  const key=`${line.type}:${line.start}:${line.end}`,existing=periods.get(key)
  periods.set(key,existing?{...line,originalAmount:total([existing.originalAmount,line.originalAmount]),paidAmount:total([existing.paidAmount,line.paidAmount]),discountAmount:total([existing.discountAmount,line.discountAmount])}:{...line})
 }
 return {...first,expiresAt:Math.min(...quotes.map(q=>q.expiresAt)),payAmount:total(quotes.map(q=>q.payAmount)),originalAmount:total(quotes.map(q=>q.originalAmount)),lines:[...periods.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.type.localeCompare(b.type))}
}
