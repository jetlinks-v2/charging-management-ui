<script setup lang="ts">
import {reactive} from 'vue'
import RoomSwitcher from '../components/RoomSwitcher.vue'
import LoadState from '../components/LoadState.vue'
import MoneyAmount from '../components/MoneyAmount.vue'
import {useRoomData} from '../hooks/useRoomData'
import {getBills,getAccounts,getOptions} from '../api/finance'
import {money} from '../services/format'
import {total} from '../services/prepay'
const vm=reactive(useRoomData(async room=>{const [bills,accounts,options]=await Promise.all([getBills(room),getAccounts(room),getOptions(room)]);return {bills,accounts,activities:[...new Map(options.flatMap(s=>s.activities).map(a=>[a.id,a])).values()]}}))
</script>
<template>
<section class="page home-page">
 <RoomSwitcher/>
 <LoadState :loading="vm.loading" :error="vm.error" @retry="vm.refresh">
  <template v-if="vm.data">
   <section class="statement">
    <div class="section-heading"><h2>我的账单</h2><router-link to="/bills">查看全部 <van-icon name="arrow"/></router-link></div>
    <router-link to="/bills" class="statement-total"><span>{{vm.data.bills.total?'待缴费用':'本房屋暂无欠费'}}</span><MoneyAmount :amount="vm.data.bills.totalAmount"/></router-link>
    <div v-if="vm.data.bills.total" class="statement-lines"><router-link v-for="bill in vm.data.bills.data.slice(0,2)" :key="bill.id" to="/bills"><span>{{bill.periodStart.slice(0,7).replace('-','年')}}月</span><strong>¥{{money(bill.arrears)}}</strong><van-icon name="arrow"/></router-link></div>
    <div v-else class="settled"><van-icon name="passed"/><span>账单已结清</span></div>
   </section>
   <router-link to="/prepay" class="prepay-entry"><span><span class="entry-icon"><van-icon name="balance-o"/></span><strong>费用预存</strong></span><span>选择月数 <van-icon name="arrow"/></span></router-link>
   <router-link to="/wallet" class="balance-link"><span>可用预存余额</span><strong>¥{{money(total(vm.data.accounts.map(a=>a.available)))}}</strong><van-icon name="arrow"/></router-link>
   <section v-if="vm.data.activities.length" class="home-activities">
    <div class="section-heading"><h2>房屋优惠</h2></div>
    <div class="list-surface"><router-link v-for="activity in vm.data.activities" :key="activity.id" :to="'/prepay?activity='+activity.id" class="activity-row"><span class="gift-icon"><van-icon name="gift-o"/></span><span class="activity-copy"><strong>{{activity.name}}</strong><span>有效期至 {{activity.endDate}}</span></span><van-icon name="arrow"/></router-link></div>
   </section>
  </template>
 </LoadState>
</section>
</template>
