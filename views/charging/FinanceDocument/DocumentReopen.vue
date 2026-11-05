<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DocumentRecord } from '../../../api/financeDocument'
import { useDocumentReopen } from '../../../hooks/finance-document/useDocumentReopen'
import DocumentBuyerForm from './DocumentBuyerForm.vue'
import DocumentSnapshot from './DocumentSnapshot.vue'
const props = defineProps<{ projectId: string; document: DocumentRecord }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useDocumentReopen(props, () => emit('saved'))
const {
  original,
  detail,
  form,
  step,
  buyer,
  model,
  reason,
  loading,
  loadFailed,
  preview,
  result,
  locked,
  busy,
  canClose,
  complete,
  calculate,
  submit,
  back,
  load,
  uncertain,
  failed
} = state
function close() {
  if (canClose.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="RedoOutlined"
    :title="t('Document.reopen')"
    @update:open="close"
  >
    <div class="document-editor">
      <a-steps
        v-if="!result"
        :current="step"
        size="small"
        :items="['correction', 'review'].map((v) => ({ title: t('Document.step.' + v) }))"
      />
      <a-alert
        v-if="uncertain || failed"
        type="warning"
        show-icon
        :message="t(failed ? 'Document.recoveryUnavailable' : 'Document.unknown')"
      />
      <DocumentSnapshot
        v-if="result"
        :value="result"
      />
      <DocumentSnapshot
        v-else-if="step === 1 && preview"
        :value="preview"
      />
      <a-spin
        v-else
        :spinning="loading"
      >
        <template v-if="detail">
          <SectionCard
            icon="FileTextOutlined"
            :title="t('Document.originalInvoice')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Document.number'), value: original.documentNumber },
                { label: t('Document.state'), value: t('Document.status.' + original.status) },
                { label: t('Document.seller'), value: original.companyName },
                { label: t('Document.total'), value: original.amount },
                { label: t('Document.reopenCount'), value: String(original.reopenCount || 0) }
              ]"
            />
          </SectionCard>
          <a-alert
            type="info"
            show-icon
            :message="
              t(original.status === 'SIMULATED_REVERSED' ? 'Document.reopenReversedHint' : 'Document.reopenHint')
            "
          />
          <a-form
            ref="form"
            layout="vertical"
            :model="model"
            :disabled="locked || busy"
          >
            <DocumentBuyerForm
              :state="state"
              type="INVOICE"
            />
            <SectionCard
              icon="EditOutlined"
              :title="t('Document.reopenReason')"
            >
              <a-form-item
                :label="t('Document.reason')"
                name="reason"
                :rules="[{ required: true, whitespace: true, message: t('Document.reasonHint') }]"
              >
                <a-textarea
                  v-model:value="reason"
                  :maxlength="500"
                  :rows="3"
                  :placeholder="t('Document.reasonHint')"
                />
              </a-form-item>
            </SectionCard>
          </a-form>
        </template>
        <div v-else-if="!loading">
          <CloudEmpty :description="t(loadFailed ? 'Finance.failed' : 'Document.empty')" />
          <a-button @click="load">{{ t('Finance.refresh') }}</a-button>
        </div>
      </a-spin>
    </div>
    <template #foot>
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="!result && !failed">
        <a-button
          v-if="step === 1 && !uncertain"
          :disabled="busy"
          @click="back"
        >
          {{ t('Document.back') }}
        </a-button>
        <j-permission-button
          v-if="step === 0"
          type="primary"
          hasPermission="charging/FinanceInvoice:reopen"
          :loading="busy"
          :disabled="!complete || !detail"
          @click="calculate"
        >
          {{ t('Document.preview') }}
        </j-permission-button>
        <j-permission-button
          v-else
          type="primary"
          hasPermission="charging/FinanceInvoice:reopen"
          :loading="busy"
          @click="submit"
        >
          {{ t(uncertain ? 'Cashier.retry' : 'Document.confirmReopen') }}
        </j-permission-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
