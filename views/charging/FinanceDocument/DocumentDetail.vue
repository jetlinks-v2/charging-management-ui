<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useDocumentWorkspace } from '../../../hooks/finance-document/useDocumentWorkspace'
import DocumentSnapshot from './DocumentSnapshot.vue'
import DocumentLogs from './DocumentLogs.vue'
import ReceiptPrintButton from './ReceiptPrintButton.vue'
import InvoicePrintButton from './InvoicePrintButton.vue'
const props = defineProps<{ state: ReturnType<typeof useDocumentWorkspace> }>()
const { t } = useI18n()
const { projectId, detail, loading, failed, closeDetail, select } = props.state
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="FileTextOutlined"
    :title="t('Document.detail')"
    @update:open="closeDetail"
  >
    <a-spin :spinning="loading">
      <div
        v-if="detail"
        class="document-editor"
      >
        <DocumentSnapshot :value="detail" />
        <a-space wrap>
          <a-button
            v-if="detail.document.originalDocumentId"
            @click="select(detail.document.originalDocumentId)"
          >
            {{ t('Document.originalInvoice') }}
          </a-button>
          <a-button
            v-if="detail.document.reverseDocumentId"
            @click="select(detail.document.reverseDocumentId)"
          >
            {{ t('Document.redInvoice') }}
          </a-button>
        </a-space>
        <a-space
          v-if="detail.document.previousDocumentId || detail.document.reopenDocumentId"
          wrap
        >
          <a-button
            v-if="detail.document.previousDocumentId"
            @click="select(detail.document.previousDocumentId)"
          >
            {{ t('Document.previousInvoice') }}
          </a-button>
          <a-button
            v-if="detail.document.reopenDocumentId"
            @click="select(detail.document.reopenDocumentId)"
          >
            {{ t('Document.replacementInvoice') }}
          </a-button>
        </a-space>
        <DocumentLogs
          :key="detail.document.id"
          :project-id="projectId"
          :document="detail.document"
        />
      </div>
      <CloudEmpty
        v-else-if="!loading"
        :description="t(failed ? 'Finance.failed' : 'Document.empty')"
      />
    </a-spin>
    <template #foot>
      <ReceiptPrintButton
        v-if="detail?.document.documentType === 'RECEIPT'"
        :project-id="projectId"
        :document="detail.document"
      />
      <InvoicePrintButton
        v-if="detail?.document.documentType === 'INVOICE'"
        :key="detail.document.id"
        :project-id="projectId"
        :document="detail.document"
      />
      <a-button @click="closeDetail">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
