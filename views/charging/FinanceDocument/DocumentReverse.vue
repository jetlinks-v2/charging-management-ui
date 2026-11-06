<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DocumentRecord } from '../../../api/financeDocument'
import { useDocumentReverse } from '../../../hooks/finance-document/useDocumentReverse'
import DocumentSnapshot from './DocumentSnapshot.vue'
const props = defineProps<{ projectId: string; document: DocumentRecord }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { model, reason, locked, canClose, submit, saving, uncertain, result, failed } = useDocumentReverse(props, () =>
  emit('saved')
)
const invoice = props.document.documentType === 'INVOICE'
const permission = invoice ? 'charging/FinanceInvoice:reverse' : 'charging/FinanceReceipt:void'
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :width="result ? 1120 : 600"
    :mask-closable="canClose"
    :closable="canClose"
    :keyboard="canClose"
    :body-style="{ maxHeight: '65vh', overflow: 'auto' }"
    :title="t(invoice ? 'Document.reverse' : 'Document.void')"
    @cancel="close"
  >
    <div class="document-editor">
      <DocumentSnapshot
        v-if="result"
        :value="result"
      />
      <template v-else>
        <a-alert
          type="warning"
          show-icon
          :message="
            t(
              failed
                ? 'Document.recoveryUnavailable'
                : uncertain
                ? 'Document.unknown'
                : invoice
                ? 'Document.reverseHint'
                : 'Document.voidHint'
            )
          "
        />
        <SectionCard
          icon="FileTextOutlined"
          :title="document.documentNumber"
        >
          <KvGrid
            :cols="1"
            :items="[
              { label: t('Document.buyer.name'), value: document.buyerName },
              { label: t('Document.seller'), value: document.companyName },
              { label: t(invoice ? 'Document.total' : 'Document.receiptAmount'), value: document.amount }
            ]"
          />
        </SectionCard>
        <a-form
          layout="vertical"
          :model="model"
          :disabled="locked"
        >
          <a-form-item
            :label="t('Document.reason')"
            name="reason"
            :rules="[{ required: true, whitespace: true, message: t('Document.reasonHint') }]"
            required
          >
            <a-textarea
              v-model:value="reason"
              :maxlength="500"
              :rows="4"
              :placeholder="t('Document.reasonHint')"
            />
          </a-form-item>
        </a-form>
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
        danger
        :hasPermission="permission"
        :loading="saving"
        :disabled="!reason.trim()"
        @click="submit"
      >
        {{ t(uncertain ? 'Cashier.retry' : invoice ? 'Document.reverse' : 'Document.void') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
