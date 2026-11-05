<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useReceivableBatch } from '../../../hooks/finance-receivable/useReceivableBatch'
import PaymentNotice from './PaymentNotice.vue'
const props = defineProps<{ state: ReturnType<typeof useReceivableBatch> }>()
const { t } = useI18n()
const { selected, deleting, busy, reason, notice, clear, startDelete, remove, preview } = props.state
</script>
<template>
  <div
    v-if="selected.length"
    class="receivable-batch-actions"
  >
    <span>{{ t('Receivable.selectedCount', { count: selected.length }) }}</span>
    <a-space wrap>
      <j-permission-button
        :hasPermission="'charging/FinanceReceivable:print'"
        :loading="busy"
        @click="preview"
      >
        <AIcon type="PrinterOutlined" />
        {{ t('Notice.title') }}
      </j-permission-button>
      <j-permission-button
        :hasPermission="'charging/FinanceReceivable:delete'"
        danger
        :disabled="busy"
        @click="startDelete"
      >
        {{ t('Receivable.batchDelete') }}
      </j-permission-button>
      <a-button
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--ant-color-fill-alter, #f5f5f5);
  border-radius: 6px;
}
</style>
