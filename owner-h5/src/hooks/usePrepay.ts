import {computed,ref,reactive,watch,onBeforeUnmount} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {showFailToast} from 'vant'
import {useRoomData} from './useRoomData'
import {getOptions,createQuote,revalidate} from '../api/finance'
import {currentRoom} from '../services/rooms'
import {proposal,proposalCurrent,combine} from '../services/prepay'
import {months} from '../services/format'
import {errorText} from '../api/http'
import type {Tier} from '../types'
import {useTierPrices,tierKey} from './useTierPrices'

export function usePrepay(){
 const route=useRoute(),router=useRouter(),options=reactive(useRoomData(getOptions))
 const activityId=ref(''),tier=ref<Tier>({paidMonths:1,giftMonths:0}),now=ref(Date.now())
 const settings=computed(()=>options.data||[])
 const activities=computed(()=>[...new Map(settings.value.flatMap(s=>s.activities).map(a=>[a.id,a])).values()])
 const activity=computed(()=>activities.value.find(a=>a.id===activityId.value))
 const allowedMonths=computed(()=>months('MONTHLY').filter(n=>settings.value.every(s=>months(s.settlementMethod).includes(n))))
 const choices=computed(()=>activity.value?activity.value.tiers.filter(t=>allowedMonths.value.includes(t.paidMonths)):allowedMonths.value.map(paidMonths=>({paidMonths,giftMonths:0})))
 watch(()=>options.data,()=>{activityId.value=activities.value.find(a=>a.id===route.query.activity)?.id||'';tier.value=choices.value[0]||{paidMonths:1,giftMonths:0}},{immediate:true})
 watch(activityId,()=>{tier.value=choices.value[0]||{paidMonths:1,giftMonths:0}},{flush:'sync'})
 const source=computed(()=>currentRoom.value&&settings.value.length?{room:currentRoom.value,settings:settings.value,tiers:choices.value,activityId:activityId.value}:undefined)
 const pricing=reactive(useTierPrices(source,createQuote))
 const selected=computed(()=>pricing.prices[tierKey(tier.value)])
 const quote=computed(()=>selected.value?.quote)
 const expired=computed(()=>!!quote.value&&quote.value.expiresAt<=now.value)
 const timer=window.setInterval(()=>now.value=Date.now(),1000)
 watch([tier,source],()=>{proposal.value=undefined},{flush:'sync'})
 async function confirm(){
  const room=currentRoom.value,price=selected.value
  if(!room||!price?.quote||!price.parts||price.error||price.loading)return
  if(price.quote.expiresAt<=Date.now()){await pricing.retry(tier.value);return}
  proposal.value={quote:price.quote,parts:price.parts,paidMonths:tier.value.paidMonths,giftMonths:activity.value?tier.value.giftMonths:0,activityName:activity.value?.name,spaceId:room.spaceId,projectId:room.projectId}
  await router.push('/confirm')
 }
 onBeforeUnmount(()=>window.clearInterval(timer))
 return {options,settings,activities,activityId,activity,tier,choices,pricing,selected,quote,expired,confirm,retry:()=>pricing.retry(tier.value)}
}
export function useConfirmation(){
 const loading=ref(false),error=ref(''),now=ref(Date.now());let generation=0
 const timer=window.setInterval(()=>now.value=Date.now(),1000)
 const expired=computed(()=>!proposalCurrent.value||proposalCurrent.value.quote.expiresAt<=now.value)
 async function confirm(){
  if(expired.value||loading.value||!proposalCurrent.value||!currentRoom.value)return
  const version=++generation,snapshot=proposalCurrent.value,room=currentRoom.value;loading.value=true;error.value=''
  try{
   const current=await getOptions(room)
   if(version!==generation)return
   const previousIds=snapshot.parts.map(p=>p.input.settingId).sort(),currentIds=current.map(s=>s.id).sort()
   if(previousIds.length!==currentIds.length||previousIds.some((id,index)=>id!==currentIds[index]))throw Error('房屋费用已变化，请返回重新选择')
   const parts=[]
   for(const part of snapshot.parts){const quote=await revalidate(room,part.quote.id);if(version!==generation)return;parts.push({...part,quote})}
   if(version!==generation||!proposal.value)return
   proposal.value={...snapshot,parts,quote:combine(parts.map(p=>p.quote))}
   // 支付渠道接入前不能将金额校验结果视为已支付。
   showFailToast('支付暂不可用，请稍后再试')
  }catch(e){if(version===generation)error.value=errorText(e)}finally{if(version===generation)loading.value=false}
 }
 watch(currentRoom,()=>{generation++;loading.value=false;error.value=''})
 onBeforeUnmount(()=>{generation++;window.clearInterval(timer)})
 return {proposal:proposalCurrent,loading,error,expired,confirm}
}
