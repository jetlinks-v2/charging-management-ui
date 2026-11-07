<script setup lang="ts">
import {reactive,ref} from 'vue'
import {RightOutlined,CheckOutlined,GiftOutlined} from '@ant-design/icons-vue'
import {usePrepay} from '../hooks/usePrepay'
import {tierKey} from '../hooks/useTierPrices'
import {money,subtract} from '../services/format'
import RoomSwitcher from '../components/RoomSwitcher.vue'
import LoadState from '../components/LoadState.vue'
import PeriodLines from '../components/PeriodLines.vue'
const vm=reactive(usePrepay()),showPeriods=ref(false)
</script>
<template>
 <section class="page with-dock prepay-page">
  <RoomSwitcher/>
  <LoadState :loading="vm.options.loading" :error="vm.options.error" :empty="!vm.settings.length" empty-text="当前房屋暂不能预存，请联系物业" @retry="vm.options.refresh">
   <div v-if="vm.settings.length" class="content-stack">
    <section v-if="vm.activities.length" class="prepay-activities">
     <h2>选择预存方式</h2>
     <div class="activity-options">
      <button :class="{selected:!vm.activityId}" :aria-pressed="!vm.activityId" @click="vm.activityId=''"><span>普通预存</span><CheckOutlined v-if="!vm.activityId" class="choice-check"/></button>
      <button v-for="activity in vm.activities" :key="activity.id" :class="{selected:vm.activityId===activity.id}" :aria-pressed="vm.activityId===activity.id" @click="vm.activityId=activity.id"><GiftOutlined/><span>{{activity.name}}</span><CheckOutlined v-if="vm.activityId===activity.id" class="choice-check"/></button>
     </div>
    </section>
    <section class="month-section">
     <div class="section-heading"><h2>{{vm.activity?'活动套餐':'预存月数'}}</h2></div>
     <div class="month-prices">
      <button v-for="tier in vm.choices" :key="tierKey(tier)" :class="{selected:vm.tier.paidMonths===tier.paidMonths&&vm.tier.giftMonths===tier.giftMonths,unavailable:!!vm.pricing.prices[tierKey(tier)]?.error}" :aria-pressed="vm.tier.paidMonths===tier.paidMonths&&vm.tier.giftMonths===tier.giftMonths" @click="vm.tier=tier">
       <span class="month-label">{{tier.paidMonths}}个月<span v-if="tier.giftMonths" class="month-gift">赠{{tier.giftMonths}}个月</span></span>
       <strong v-if="vm.pricing.prices[tierKey(tier)]?.quote" class="month-price">¥{{money(vm.pricing.prices[tierKey(tier)].quote!.payAmount)}}</strong>
       <span v-else-if="vm.pricing.prices[tierKey(tier)]?.error" class="price-state">暂不可用</span>
       <span v-else class="price-state"><a-spin size="small"/></span>
       <CheckOutlined v-if="vm.tier.paidMonths===tier.paidMonths&&vm.tier.giftMonths===tier.giftMonths" class="month-check"/>
      </button>
     </div>
     <p v-if="!vm.choices.length" class="empty-inline">当前房屋暂无可用套餐，请联系物业</p>
    </section>
    <div v-if="vm.selected?.error" class="price-error" role="alert"><p>{{vm.selected.error}}</p><a-button :disabled="vm.pricing.busy" @click="vm.retry">重新加载</a-button></div>
    <div v-if="vm.expired" class="price-error" role="alert"><p>金额已过期，请刷新后继续</p><a-button :disabled="vm.pricing.busy" @click="vm.retry">刷新金额</a-button></div>
    <section v-if="vm.quote" class="quote-summary">
     <div class="row"><h2>费用明细</h2><a-tag v-if="vm.quote.lines.some(line=>line.type==='ARREARS')" color="orange">含历史欠费</a-tag></div>
     <dl class="detail-list"><div><dt>费用合计</dt><dd>¥{{money(vm.quote.originalAmount)}}</dd></div><div v-if="vm.quote.originalAmount!==vm.quote.payAmount"><dt>优惠减免</dt><dd class="positive">−¥{{money(subtract(vm.quote.originalAmount,vm.quote.payAmount))}}</dd></div></dl>
     <button class="row block-link" @click="showPeriods=true"><span>抵扣账期</span><span>{{vm.quote.lines.length}}期 <RightOutlined/></span></button>
    </section>
   </div>
  </LoadState>
 </section>
 <div v-if="vm.settings.length" class="dock">
  <div><span class="dock-label">预存金额</span><strong>{{vm.quote?'¥'+money(vm.quote.payAmount):vm.selected?.error?'暂不可用':'—'}}</strong></div>
  <a-button type="primary" size="large" :loading="vm.selected?.loading" :disabled="!vm.quote||!!vm.selected?.error||vm.expired" @click="vm.confirm">下一步</a-button>
 </div>
 <a-drawer root-class-name="owner-drawer" v-model:open="showPeriods" title="抵扣明细" placement="bottom" height="min(85dvh,720px)"><PeriodLines v-if="vm.quote" :quote="vm.quote"/></a-drawer>
</template>
