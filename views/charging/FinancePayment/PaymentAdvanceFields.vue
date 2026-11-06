<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../components/FinanceAttachmentUpload.vue'
import type { usePaymentToAdvance } from '../../../hooks/finance-cashier/usePaymentToAdvance'
const props = defineProps<{ state: ReturnType<typeof usePaymentToAdvance> }>()
const { t } = useI18n()
const { model, house, picker, options, availableStandards, files, filesChanged } = props.state
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="HomeOutlined"
    :title="t('PaymentAdvance.target')"
  >
    <a-form-item
      :label="t('Funds.targetHouse')"
      name="spaceId"
      :rules="required('Funds.targetHouse')"
    >
      <a-button
        block
        @click="picker = true"
      >
        {{ house?.house.fullName || t('Setting.chooseHouse') }}
      </a-button>
    </a-form-item>
    <div class="cashier-grid">
      <a-form-item
        :label="t('Funds.targetCustomer')"
        name="relationshipId"
        :rules="required('Funds.targetCustomer')"
      >
        <a-select
          v-model:value="model.relationshipId"
          :disabled="!house"
          :placeholder="t('Setting.customer')"
          :options="house?.customers.map((c) => ({ value: c.relationshipId, label: c.name }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('PaymentAdvance.targetCompany')"
        name="targetCompanyId"
        :rules="required('PaymentAdvance.targetCompany')"
      >
        <a-select
          v-model:value="model.targetCompanyId"
          :options="options.companies.map((c) => ({ value: c.id, label: c.name }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Funds.targetStandard')"
        name="standardId"
        :rules="required('Funds.targetStandard')"
      >
        <a-select
          v-model:value="model.standardId"
          show-search
          option-filter-prop="label"
          :placeholder="t('Setting.standard')"
          :options="availableStandards.map((s) => ({ value: s.id, label: s.subjectName + ' · ' + s.standardName }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('PaymentAdvance.amount')"
        name="amount"
        :rules="required('PaymentAdvance.amount')"
      >
        <a-input-number
          v-model:value="model.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
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
      <a-form-item :label="t('Receivable.calcStartDate')">
        <a-date-picker
          v-model:value="model.startDate"
          :placeholder="t('Receivable.calcStartDate')"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>
      <a-form-item :label="t('Receivable.calcEndDate')">
        <a-date-picker
          v-model:value="model.endDate"
          :placeholder="t('Receivable.calcEndDate')"
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
    <a-form-item :label="t('FinanceAttachment.label')">
      <FinanceAttachmentUpload
        :value="files"
        :max-count="1"
        @upload-change="filesChanged"
      />
    </a-form-item>
  </SectionCard>
</template>
