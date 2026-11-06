<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../components/FinanceAttachmentUpload.vue'
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
  <a-modal
    :open="true"
    centered
    :width="880"
    :style="{ maxWidth: 'calc(100vw - 2rem)' }"
    :body-style="{ maxHeight: 'calc(100dvh - 13rem)', overflowY: 'auto' }"
    :title="t('FinanceHandover.create')"
    :mask-closable="false"
    :closable="canClose"
    :keyboard="canClose"
    @cancel="close"
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
        <a-alert
          v-if="!preview"
          type="info"
          show-icon
          :message="t('FinanceHandover.reviewHint', { count: candidates.length })"
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
          <a-form-item class="handover-attachment" :label="t('FinanceAttachment.label')">
            <FinanceAttachmentUpload
              :value="files"
              :max-count="5"
              :disabled="locked"
              @upload-change="filesChanged"
            />
          </a-form-item>
        </a-form>
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
    <template #footer>
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
  </a-modal>
</template>
