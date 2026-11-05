<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RefundEditInput } from '../../../api/financeRefundApplication'
defineProps<{ model: RefundEditInput; saving: boolean }>()
const emit = defineEmits<{ (e: 'save'): void; (e: 'close'): void }>()
const { t } = useI18n()
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Refund.editApplication')"
    :confirm-loading="saving"
    :mask-closable="false"
    :closable="!saving"
    :keyboard="!saving"
    @ok="emit('save')"
    @cancel="emit('close')"
  >
    <a-form
      layout="vertical"
      :disabled="saving"
    >
      <a-form-item
        :label="t('Refund.amount')"
        required
      >
        <a-input
          v-model:value="model.amount"
          inputmode="decimal"
          :maxlength="20"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.receiver')"
        required
      >
        <a-input
          v-model:value="model.receiverName"
          :maxlength="128"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.refundedAt')"
        required
      >
        <a-date-picker
          v-model:value="model.refundedAt"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.reason')"
        required
      >
        <a-textarea
          v-model:value="model.reason"
          :rows="3"
          :maxlength="1000"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
