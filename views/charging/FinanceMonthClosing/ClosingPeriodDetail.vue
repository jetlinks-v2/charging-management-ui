<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ClosingRecords from './ClosingRecords.vue'
import type { AccountingPeriod, ClosingAction } from '../../../api/financeAccounting'
defineProps<{ period: AccountingPeriod; projectId: string; blocked: boolean }>()
const emit = defineEmits<{ close: []; action: [action: ClosingAction] }>(),
  { t } = useI18n()
</script>
<template>
  <JlDrawerShell
    :open="true"
    :title="period.accountMonth"
    :width="1000"
    @update:open="emit('close')"
  >
    <a-tag>{{ t('MonthClosing.status.' + period.status) }}</a-tag>
    <p>{{ period.startDate }} ~ {{ period.endDate }}</p>
    <p>{{ t(period.status === 'OPEN' ? 'MonthClosing.openHint' : 'MonthClosing.closedHint') }}</p>
    <ClosingRecords
      :key="projectId + period.accountMonth"
      :project-id="projectId"
      :month="period.accountMonth"
    />
    <template #foot>
      <j-permission-button
        :hasPermission="'charging/FinanceMonthClosing:' + (period.status === 'OPEN' ? 'close' : 'reopen')"
        :disabled="blocked"
        @click="emit('action', period.status === 'OPEN' ? 'CLOSE' : 'REOPEN')"
      >
        {{ t('MonthClosing.action.' + (period.status === 'OPEN' ? 'CLOSE' : 'REOPEN')) }}
      </j-permission-button>
    </template>
  </JlDrawerShell>
</template>
