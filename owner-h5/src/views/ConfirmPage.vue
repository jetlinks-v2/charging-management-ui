<script setup lang="ts">
import {reactive,ref} from 'vue'
import {RightOutlined} from '@ant-design/icons-vue'
import {useConfirmation} from '../hooks/usePrepay'
import {money,subtract} from '../services/format'
import PeriodLines from '../components/PeriodLines.vue'
import MoneyAmount from '../components/MoneyAmount.vue'
const vm=reactive(useConfirmation()),periodsOpen=ref(false)
</script>
<template>
<section class="page with-dock confirm-page">
 <template v-if="vm.proposal">
  <a-alert v-if="vm.expired" message="金额已过期，请返回重新选择" type="warning" show-icon/>
  <section class="confirmation-total"><h2>预存{{vm.proposal.paidMonths}}个月<span v-if="vm.proposal.giftMonths">，赠{{vm.proposal.giftMonths}}个月</span></h2><MoneyAmount :amount="vm.proposal.quote.payAmount"/><p class="room-path">{{vm.proposal.quote.houseName}}</p></section>
  <section class="confirmation-card">
   <dl class="detail-list"><div v-if="vm.proposal.activityName"><dt>优惠活动</dt><dd>{{vm.proposal.activityName}}</dd></div><div><dt>费用合计</dt><dd>¥{{money(vm.proposal.quote.originalAmount)}}</dd></div><div v-if="vm.proposal.quote.originalAmount!==vm.proposal.quote.payAmount"><dt>优惠减免</dt><dd class="positive">−¥{{money(subtract(vm.proposal.quote.originalAmount,vm.proposal.quote.payAmount))}}</dd></div></dl>
   <button class="row block-link" @click="periodsOpen=true"><span>抵扣明细</span><span>{{vm.proposal.quote.lines.length}}期 <RightOutlined/></span></button>
  </section>
  <a-alert v-if="vm.error" :message="vm.error" type="error" show-icon/>
  <router-link v-if="vm.error||vm.expired" class="block-link" to="/prepay">返回重新选择</router-link>
 </template>
 <a-empty v-else description="请先选择预存月数"><router-link to="/prepay">选择预存月数</router-link></a-empty>
</section>
<div v-if="vm.proposal" class="dock"><div><span class="dock-label">预存金额</span><strong>¥{{money(vm.proposal.quote.payAmount)}}</strong></div><a-button type="primary" size="large" :disabled="vm.expired" :loading="vm.loading" @click="vm.confirm">确认支付</a-button></div>
<a-drawer root-class-name="owner-drawer" v-model:open="periodsOpen" title="抵扣明细" placement="bottom" height="min(85dvh,720px)"><PeriodLines v-if="vm.proposal" :quote="vm.proposal.quote"/></a-drawer>
</template>
