<script setup lang="ts">
import type {Quote} from '../types'
import {money,periodType,subtract} from '../services/format'
defineProps<{quote:Quote}>()
</script>
<template><div class="period-lines">
 <article v-for="line in quote.lines" :key="line.type+line.start+line.end" class="period-line">
  <div class="row"><strong>{{line.start}} 至 {{line.end}}</strong><van-tag :type="line.type==='ARREARS'?'warning':'primary'">{{periodType(line.type)}}</van-tag></div>
  <dl class="period-numbers"><div><dt>费用</dt><dd>¥{{money(line.originalAmount)}}</dd></div><div><dt>预存抵扣</dt><dd>¥{{money(line.paidAmount)}}</dd></div><div><dt>优惠</dt><dd class="positive">¥{{money(line.discountAmount)}}</dd></div></dl>
 </article>
 <dl class="detail-list"><div><dt>预存合计</dt><dd>¥{{money(quote.payAmount)}}</dd></div><div><dt>优惠合计</dt><dd class="positive">¥{{money(subtract(quote.originalAmount,quote.payAmount))}}</dd></div></dl>
</div></template>
