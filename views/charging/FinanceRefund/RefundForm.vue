<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../components/FinanceAttachmentUpload.vue'
import type { useRefund } from '../../../hooks/finance-cashier/useRefund'
const props = defineProps<{ state: ReturnType<typeof useRefund> }>()
const { model, company, funding, files, filesChanged, loading, calculating, saving } = props.state
const { t } = useI18n()
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Refund.info')"
  >
    <div class="cashier-grid">
      <a-form-item :label="t('Cashier.company')">
        <a-input
          :value="company?.name"
          disabled
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.amount')"
        name="amount"
        :rules="required('Refund.amount')"
      >
        <a-input-number
          v-model:value="model.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.method')"
        name="optionId"
        :rules="required('Refund.method')"
      >
        <a-select
          v-model:value="model.optionId"
          :options="
            funding.map((item) => ({ value: item.id, label: [item.text, item.bankName].filter(Boolean).join(' · ') }))
          "
          :placeholder="t('Cashier.chooseFunding')"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.refundedAt')"
        name="refundedAt"
        :rules="required('Refund.refundedAt')"
      >
        <a-date-picker
          v-model:value="model.refundedAt"
          :show-time="{ format: 'HH:mm' }"
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm"
        />
      </a-form-item>
      <a-form-item
        :label="t('Refund.receiver')"
        name="receiverName"
        :rules="required('Refund.receiver')"
      >
        <a-input
          v-model:value="model.receiverName"
          :maxlength="128"
        />
      </a-form-item>
    </div>
    <a-form-item
      :label="t('Refund.reason')"
      name="reason"
      :rules="required('Refund.reason')"
    >
      <a-textarea
        v-model:value="model.reason"
        :maxlength="1000"
        :rows="3"
        show-count
      />
    </a-form-item>
    <a-form-item :label="t('FinanceAttachment.label')">
      <FinanceAttachmentUpload
        :value="files"
        :max-count="1"
        :disabled="loading || calculating || saving"
        @upload-change="filesChanged"
      />
    </a-form-item>
  </SectionCard>
</template>
