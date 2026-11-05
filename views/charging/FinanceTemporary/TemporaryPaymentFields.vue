<script setup lang="ts">
import { FileUpload } from '@jetlinks-web-core/components'
import type { useTemporaryEditor } from '../../../hooks/finance-temporary/useTemporaryEditor'
import CashierFunding from '../FinanceCashier/CashierFunding.vue'
const props = defineProps<{ state: ReturnType<typeof useTemporaryEditor> }>()
const { t, model, files, filesChanged, confirmation } = props.state
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Cashier.paymentInfo')"
  >
    <div class="cashier-grid">
      <a-form-item
        :label="t('Cashier.paidAt')"
        name="paidAt"
        :rules="required('Cashier.paidAt')"
      >
        <a-date-picker
          v-model:value="model.paidAt"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
        />
      </a-form-item>
      <a-form-item
        :label="t('Cashier.payer')"
        name="payerName"
        :rules="required('Cashier.payer')"
      >
        <a-input
          v-model:value="model.payerName"
          :maxlength="128"
        />
      </a-form-item>
    </div>
  </SectionCard>
  <CashierFunding :state="state" />
  <SectionCard
    icon="PaperClipOutlined"
    :title="t('Cashier.supplement')"
  >
    <a-form-item :label="t('Setting.remark')">
      <a-textarea
        v-model:value="model.remark"
        :maxlength="1000"
        :rows="2"
        show-count
      />
    </a-form-item>
    <a-form-item :label="t('Cashier.attachmentHint')">
      <FileUpload
        :value="files"
        :size="20"
        :max-count="1"
        :disabled="confirmation.calculating.value || confirmation.saving.value"
        :btn-text="t('Adjustment.upload')"
        @upload-change="filesChanged"
      />
    </a-form-item>
  </SectionCard>
</template>
