<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../../components/FinanceAttachmentUpload.vue'
import type { usePrepay } from '../../../../hooks/finance-prepay/usePrepay'
import CashierFunding from '../CashierFunding.vue'
const props = defineProps<{ state: ReturnType<typeof usePrepay> }>()
const { model, form, uncertain, saving, files, filesChanged } = props.state
const { t } = useI18n()
</script>
<template>
  <a-form
    ref="form"
    :model="model"
    layout="vertical"
    class="cashier-form"
    :disabled="uncertain || saving"
  >
    <SectionCard
      icon="CalendarOutlined"
      :title="t('Cashier.paymentInfo')"
    >
      <a-form-item
        name="paidAt"
        :label="t('Cashier.paidAt')"
        :rules="[{ required: true, message: t('Finance.required', { field: t('Cashier.paidAt') }) }]"
      >
        <a-date-picker
          v-model:value="model.paidAt"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
        />
      </a-form-item>
    </SectionCard>
    <CashierFunding :state="state" />
    <SectionCard
      icon="PaperClipOutlined"
      :title="t('Cashier.supplement')"
    >
      <a-form-item
        name="remark"
        :label="t('Setting.remark')"
      >
        <a-textarea
          v-model:value="model.remark"
          :rows="2"
          :maxlength="1000"
          show-count
        />
      </a-form-item>
      <a-form-item
        name="attachmentFileId"
        :label="t('FinanceAttachment.label')"
      >
        <FinanceAttachmentUpload
          :value="files"
          :max-count="1"
          :disabled="uncertain || saving"
          @upload-change="filesChanged"
        />
      </a-form-item>
    </SectionCard>
  </a-form>
</template>
