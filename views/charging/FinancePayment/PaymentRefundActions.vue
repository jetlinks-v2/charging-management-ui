<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useRefundFlow } from '../../../hooks/finance-cashier/useRefundFlow'
import RefundEditor from '../FinanceRefund/RefundEditor.vue'
const props = defineProps<{ projectId: string; state: ReturnType<typeof useRefundFlow>; permission?: string }>()
const { selected, rows, pending, failed, start, close, saved } = props.state
const { t } = useI18n()
</script>
<template>
  <a-alert
    v-if="pending"
    type="warning"
    show-icon
    :message="t('Refund.pending')"
    class="payment-pending"
  >
    <template #action>
      <j-permission-button
        :hasPermission="permission || 'charging/FinancePayment:refund'"
        @click="rows = []"
      >
        {{ t('Cashier.retry') }}
      </j-permission-button>
    </template>
  </a-alert>
  <div
    v-if="selected.length"
    class="cashier-selected"
  >
    <span>{{ t('Receivable.selectedCount', { count: selected.length }) }}</span>
    <a-space wrap>
      <a-button
        type="link"
        @click="selected = []"
      >
        {{ t('Receivable.clearSelection') }}
      </a-button>
      <j-permission-button
        :hasPermission="permission || 'charging/FinancePayment:refund'"
        :disabled="pending || failed || selected.length > 100"
        @click="start(selected)"
      >
        <AIcon type="RollbackOutlined" />
        {{ t('Refund.start') }}
      </j-permission-button>
    </a-space>
  </div>
  <RefundEditor
    v-if="rows"
    :project-id="projectId"
    :rows="rows"
    @close="close"
    @saved="saved"
  />
</template>
<style scoped>
.payment-pending {
  margin-bottom: 16px;
}
</style>
