<script setup lang="ts">
import type { useFundEditor } from '../../../hooks/finance-funds/useFundEditor'
import { FileUpload } from '@jetlinks-web-core/components'
const props = defineProps<{ state: ReturnType<typeof useFundEditor> }>()
const { t, model, funding, optionId, quote, files, filesChanged } = props.state
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="WalletOutlined"
    :title="t('Funds.operationInfo')"
  >
    <div class="cashier-grid">
      <a-form-item
        :label="t('Funds.amount')"
        name="amount"
        :rules="required('Funds.amount')"
      >
        <a-input-number
          v-model:value="model.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
          :disabled="!!model.quantity || model.action === 'OFFSET'"
        />
      </a-form-item>
      <a-form-item
        v-if="model.action === 'TOPUP'"
        :label="t('Funds.quantity')"
      >
        <a-input-number
          v-model:value="model.quantity"
          string-mode
          :precision="4"
          :min="'0.0001'"
          @change="quote"
        />
      </a-form-item>
      <a-form-item
        v-if="['TOPUP', 'REFUND'].includes(model.action)"
        :label="t('Cashier.method')"
        name="method"
        :rules="required('Cashier.method')"
      >
        <a-select
          v-model:value="optionId"
          :options="funding.map((v) => ({ value: v.id, label: [v.text, v.bankName].filter(Boolean).join(' · ') }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Funds.occurredAt')"
        name="occurredAt"
        :rules="required('Funds.occurredAt')"
      >
        <a-date-picker
          v-model:value="model.occurredAt"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
        />
      </a-form-item>
      <a-form-item
        :label="t('Funds.payer')"
        name="payerName"
        :rules="required('Funds.payer')"
      >
        <a-input
          v-model:value="model.payerName"
          :maxlength="128"
        />
      </a-form-item>
      <a-form-item
        v-if="model.action === 'TOPUP' && model.type === 'ADVANCE'"
        :label="t('Receivable.calcStartDate')"
      >
        <a-date-picker
          v-model:value="model.startDate"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>
      <a-form-item
        v-if="model.action === 'TOPUP' && model.type === 'ADVANCE'"
        :label="t('Receivable.calcEndDate')"
      >
        <a-date-picker
          v-model:value="model.endDate"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>
    </div>
    <a-form-item
      :label="t('Funds.reason')"
      name="reason"
      :rules="required('Funds.reason')"
    >
      <a-textarea
        v-model:value="model.reason"
        :maxlength="1000"
        :rows="3"
        show-count
      />
    </a-form-item>
    <a-form-item :label="t('Cashier.attachmentHint')">
      <FileUpload
        :value="files"
        :max-count="1"
        :size="20"
        :btn-text="t('Adjustment.upload')"
        @upload-change="filesChanged"
      />
    </a-form-item>
  </SectionCard>
</template>
