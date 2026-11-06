<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import type { HandoverCandidate } from '../../../api/financeHandover'
import { useHandoverEditor } from '../../../hooks/finance-handover/useHandoverEditor'
import HandoverLines from './HandoverLines.vue'
const props = defineProps<{ projectId: string; candidates: HandoverCandidate[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const {
  form,
  files,
  filesChanged,
  uploading,
  preview,
  result,
  calculating,
  saving,
  uncertain,
  failed,
  locked,
  canClose,
  calculate,
  submit
} = useHandoverEditor(props, () => emit('saved'))
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="AuditOutlined"
    :title="t('FinanceHandover.create')"
    @update:open="close"
  >
    <div class="handover-content">
      <a-result
        v-if="result"
        status="success"
        :title="t('FinanceHandover.created')"
        :sub-title="t('FinanceHandover.waitReview')"
      />
      <template v-else>
        <a-alert
          v-if="uncertain || failed"
          show-icon
          type="warning"
          :message="t(failed ? 'Document.recoveryUnavailable' : 'FinanceHandover.unknown')"
        />
        <a-form
          layout="vertical"
          :disabled="locked"
          class="handover-form"
        >
          <a-form-item
            :label="t('FinanceHandover.date')"
            required
          >
            <a-date-picker
              v-model:value="form.closingDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item :label="t('FinanceHandover.remark')">
            <a-textarea
              v-model:value="form.remark"
              :maxlength="1000"
              :rows="2"
              show-count
            />
          </a-form-item>
          <a-form-item :label="t('Cashier.attachmentHint')">
            <FileUpload
              :value="files"
              :size="20"
              :max-count="5"
              :disabled="locked"
              :btn-text="t('Adjustment.upload')"
              @upload-change="filesChanged"
            />
          </a-form-item>
        </a-form>
        <a-alert
          v-if="!preview"
          type="info"
          show-icon
          :message="t('FinanceHandover.reviewHint', { count: candidates.length })"
        />
        <SectionCard
          v-if="preview"
          icon="ProfileOutlined"
          :title="t('FinanceHandover.review')"
        >
          <a-descriptions
            :column="2"
            size="small"
          >
            <a-descriptions-item :label="t('FinanceHandover.amount')">
              <strong class="handover-money">￥{{ preview.amount }}</strong>
            </a-descriptions-item>
            <a-descriptions-item :label="t('FinanceHandover.cash')">
              <strong class="handover-money">￥{{ preview.cashAmount }}</strong>
            </a-descriptions-item>
          </a-descriptions>
          <HandoverLines :lines="preview.lines" />
        </SectionCard>
      </template>
    </div>
    <template #foot>
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        v-if="!result && !failed"
        type="primary"
        hasPermission="charging/FinanceHandover:create"
        :disabled="uploading"
        :loading="calculating || saving"
        @click="preview ? submit() : calculate()"
      >
        {{ t(uncertain ? 'Cashier.retry' : preview ? 'FinanceHandover.confirm' : 'FinanceHandover.preview') }}
      </j-permission-button>
    </template>
  </JlDrawerShell>
</template>
