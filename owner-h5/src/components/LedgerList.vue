<script setup lang="ts">
import {ArrowDownOutlined,ArrowUpOutlined,RollbackOutlined} from '@ant-design/icons-vue'
import {cents,entryAction,signedMoney,time} from '../services/format'
import type {Entry} from '../types'
defineProps<{entries:Entry[]}>()
</script>
<template><div class="ledger-list">
 <article v-for="entry in entries" :key="entry.id" class="ledger-item">
  <span class="ledger-icon"><RollbackOutlined v-if="entry.action.startsWith('REVOKE')"/><ArrowDownOutlined v-else-if="cents(entry.amount)>0n"/><ArrowUpOutlined v-else/></span>
  <div class="ledger-copy"><h2>{{entryAction(entry.action)}}</h2><time>{{time(entry.occurredAt)}}</time></div>
  <strong class="ledger-amount" :class="{positive:cents(entry.amount)>0n}">{{signedMoney(entry.amount)}}</strong>
 </article>
</div></template>
