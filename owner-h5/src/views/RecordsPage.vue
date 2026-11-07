<script setup lang="ts">
import {reactive} from 'vue'
import {CheckCircleOutlined} from '@ant-design/icons-vue'
import RoomSwitcher from '../components/RoomSwitcher.vue'
import LoadState from '../components/LoadState.vue'
import {getRecords} from '../api/finance'
import {useRoomPage} from '../hooks/useRoomData'
import {money,time,paidStatus} from '../services/format'
const vm=reactive(useRoomPage(getRecords))
</script>
<template>
<section class="page records-page"><RoomSwitcher/>
 <LoadState :loading="vm.loading&&!vm.rows.length" :error="vm.error" :empty="!vm.rows.length" empty-text="暂无缴费记录" @retry="vm.load(true)">
  <div class="record-stack"><article v-for="row in vm.rows" :key="row.id" class="payment-card">
   <div class="payment-head"><span class="payment-icon"><CheckCircleOutlined/></span><div class="payment-copy"><strong>费用缴纳</strong><time>{{time(row.paidAt)}}</time></div><strong class="payment-amount">¥{{money(row.amount)}}</strong></div>
   <div class="payment-meta"><span>{{row.start}} 至 {{row.end}}</span><a-tag :color="Number(row.refunded)>0?'orange':'green'">{{Number(row.refunded)>0?(Number(row.refunded)>=Number(row.amount)?'已退款':'部分退款'):paidStatus(row.status)}}</a-tag></div>
   <div class="payment-method">{{row.method||'—'}}</div>
   <div v-if="Number(row.refunded)>0" class="refund-line"><span>已退款</span><strong>¥{{money(row.refunded)}}</strong></div>
  </article></div>
  <a-button v-if="vm.rows.length<vm.total" class="load-more" :loading="vm.loading" @click="vm.load()">加载更多</a-button>
 </LoadState>
</section>
</template>
