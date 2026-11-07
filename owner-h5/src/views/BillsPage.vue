<script setup lang="ts">
import {ref,reactive,watch,computed} from 'vue'
import {CalendarOutlined,DownOutlined} from '@ant-design/icons-vue'
import RoomSwitcher from '../components/RoomSwitcher.vue'
import LoadState from '../components/LoadState.vue'
import {getBills} from '../api/finance'
import {useRoomPage} from '../hooks/useRoomData'
import {money} from '../services/format'
const mode=ref('unpaid'),paid=computed(()=>mode.value==='paid'),vm=reactive(useRoomPage((room,page)=>getBills(room,paid.value,page)))
const expanded=ref<string[]>([])
watch(mode,()=>{expanded.value=[];void vm.load(true)})
function toggle(id:string){expanded.value=expanded.value.includes(id)?expanded.value.filter(v=>v!==id):[...expanded.value,id]}
</script>
<template>
<section class="page bills-page">
 <RoomSwitcher/>
 <div class="page-tabs"><a-segmented v-model:value="mode" block :options="[{label:'待缴费用',value:'unpaid'},{label:'已缴费用',value:'paid'}]"/></div>
 <LoadState :loading="vm.loading&&!vm.rows.length" :error="vm.error" :empty="!vm.rows.length" empty-text="暂无对应账单" @retry="vm.load(true)">
  <div class="record-stack">
   <article v-for="bill in vm.rows" :key="bill.id" class="bill-card">
    <button class="bill-toggle" :aria-expanded="expanded.includes(bill.id)" @click="toggle(bill.id)">
     <span class="bill-calendar"><CalendarOutlined/></span>
     <span class="bill-copy"><strong>{{bill.periodStart.slice(0,7).replace('-','年')}}月</strong><span>{{bill.periodStart}} 至 {{bill.periodEnd}}</span></span>
     <span class="bill-right"><strong>¥{{money(paid?bill.paidAmount:bill.arrears)}}</strong><a-tag :color="paid?'green':'orange'">{{paid?'已缴清':Number(bill.paidAmount)>0?'部分已缴':'待缴'}}</a-tag></span>
     <DownOutlined class="expand-icon" :class="{rotated:expanded.includes(bill.id)}"/>
    </button>
    <dl v-if="expanded.includes(bill.id)" class="detail-list bill-breakdown"><div><dt>截止日期</dt><dd>{{bill.dueDate||'—'}}</dd></div><div><dt>应缴金额</dt><dd>¥{{money(bill.amount)}}</dd></div><div><dt>已缴金额</dt><dd>¥{{money(bill.paidAmount)}}</dd></div><div v-if="Number(bill.discount)>0"><dt>优惠减免</dt><dd class="positive">¥{{money(bill.discount)}}</dd></div><div v-if="Number(bill.lateFee)>0"><dt>违约金</dt><dd>¥{{money(bill.lateFee)}}</dd></div><div v-if="bill.periodStatus==='OPEN'"><dt>账期状态</dt><dd>待结算</dd></div></dl>
   </article>
  </div>
  <a-button v-if="vm.rows.length<vm.total" class="load-more" :loading="vm.loading" @click="vm.load()">加载更多</a-button>
 </LoadState>
</section>
</template>
