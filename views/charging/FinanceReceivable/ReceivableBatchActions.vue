<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useReceivableBatch } from '../../../hooks/finance-receivable/useReceivableBatch'
import PaymentNotice from './PaymentNotice.vue'
const props = defineProps<{ state: ReturnType<typeof useReceivableBatch> }>()
const { t } = useI18n()
const { selected, deleting, busy, reason, notice, clear, startDelete, remove, preview } = props.state
</script>
<template>
  <div class="receivable-batch-actions">
    <a-space wrap>
      <j-permission-button
        :hasPermission="'charging/FinanceReceivable:print'"
        :loading="busy"
        :disabled="!selected.length"
        @click="preview"
      >
        <AIcon type="PrinterOutlined" />
        {{ t('ReceivableLedger.print') }}
      </j-permission-button>
      <j-permission-button
        :hasPermission="'charging/FinanceReceivable:delete'"
        danger
        :disabled="busy || !selected.length"
        @click="startDelete"
      >
        {{ t('Receivable.batchDelete') }}
      </j-permission-button>
      <a-button
        v-if="selected.length"
        type="link"
        :disabled="busy"
        @click="clear"
      >
        {{ t('Receivable.clearSelection') }}
      </a-button>
    </a-space>
  </div>
  <a-modal
    :open="deleting"
    :title="t('Receivable.batchDelete')"
    :confirm-loading="busy"
    :closable="!busy"
    :mask-closable="!busy"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    :ok-button-props="{ danger: true, disabled: !reason.trim() }"
    :ok-text="t('Receivable.confirmAction')"
    @cancel="deleting = false"
    @ok="remove"
  >
    <p>{{ t('Receivable.batchConfirm', { count: selected.length }) }}</p>
    <a-form layout="vertical">
      <a-form-item
        required
        :label="t('Receivable.reason')"
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy"
          :maxlength="500"
          :rows="4"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
  <PaymentNotice
    v-if="notice"
    :notice="notice"
    @close="notice = undefined"
  />
</template>
<style scoped>
.receivable-batch-actions {
  display: inline-flex;
}
</style>
