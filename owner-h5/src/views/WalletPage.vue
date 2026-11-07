<script setup lang="ts">
import {reactive} from 'vue'
import {RightOutlined,WalletOutlined,FileTextOutlined} from '@ant-design/icons-vue'
import RoomSwitcher from '../components/RoomSwitcher.vue'
import LoadState from '../components/LoadState.vue'
import MoneyAmount from '../components/MoneyAmount.vue'
import LedgerList from '../components/LedgerList.vue'
import {getAccounts,getRoomEntries} from '../api/finance'
import {useRoomData} from '../hooks/useRoomData'
import {money,subtract} from '../services/format'
import {total} from '../services/prepay'
const vm=reactive(useRoomData(getAccounts)),recent=reactive(useRoomData(getRoomEntries))
</script>
<template>
<section class="page wallet-page">
 <RoomSwitcher/>
 <LoadState :loading="vm.loading" :error="vm.error" @retry="vm.refresh">
  <section v-if="vm.data" class="wallet-account">
   <div class="section-heading"><h2>可用余额</h2><WalletOutlined/></div>
   <MoneyAmount :amount="total(vm.data.map(a=>a.available))"/>
   <p v-if="total(vm.data.map(a=>a.balance))!==total(vm.data.map(a=>a.available))" class="refund-pending">退款处理中 ¥{{money(subtract(total(vm.data.map(a=>a.balance)),total(vm.data.map(a=>a.available))))}}</p>
   <div class="account-actions"><router-link to="/prepay">费用预存 <RightOutlined/></router-link><router-link to="/wallet/entries">收支明细 <RightOutlined/></router-link></div>
  </section>
 </LoadState>
 <section class="recent-section">
  <div class="section-heading"><h2>最近收支</h2><router-link to="/wallet/entries">全部 <RightOutlined/></router-link></div>
  <div class="list-surface"><LoadState :loading="recent.loading" :error="recent.error" :empty="!recent.data?.data.length" empty-text="暂无收支记录" @retry="recent.refresh"><LedgerList v-if="recent.data" :entries="recent.data.data.slice(0,5)"/></LoadState></div>
 </section>
 <router-link to="/records" class="standalone-link"><FileTextOutlined/><span>缴费记录</span><RightOutlined/></router-link>
</section>
</template>
