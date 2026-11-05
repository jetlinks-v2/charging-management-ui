<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentRecord } from '../../../api/financeDocument'
import { useReceiptPrint } from '../../../hooks/finance-document/useReceiptPrint'
const props = defineProps<{ projectId: string; document: DocumentRecord }>()
const { t } = useI18n()
const { open, busy, url, show, close } = useReceiptPrint(
  () => props.projectId,
  () => props.document
)
const frame = ref<HTMLIFrameElement>()
const filename = computed(() => `${props.document.documentNumber.replace(/[^\w-]/g, '_')}.pdf`)
</script>
<template>
  <j-permission-button
    :hasPermission="'charging/FinanceReceipt:print'"
    :loading="busy"
    @click="show"
  >
    <AIcon type="PrinterOutlined" />
    {{ t('Document.receiptPreview') }}
  </j-permission-button>
  <a-modal
    :open="open"
    :title="t('Document.printTitle')"
    :width="1120"
    :body-style="{ padding: 0 }"
    :mask-closable="false"
    @cancel="close"
  >
    <div class="receipt-print-preview">
      <a-spin
        v-if="busy"
        :tip="t('Document.printLoading')"
      />
      <iframe
        ref="frame"
        v-else-if="url"
        :src="url + '#view=FitH&navpanes=0'"
        :title="t('Document.printTitle')"
        referrerpolicy="no-referrer"
      />
    </div>
    <template #footer>
      <a-button @click="close">{{ t('Finance.close') }}</a-button>
      <a-button
        v-if="url"
        @click="frame?.contentWindow?.print()"
      >
        {{ t('Document.print') }}
      </a-button>
      <a-button
        v-if="url"
        type="primary"
        :href="url"
        :download="filename"
      >
        <AIcon type="DownloadOutlined" />
        {{ t('Document.downloadPdf') }}
      </a-button>
    </template>
  </a-modal>
</template>
<style scoped>
.receipt-print-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: min(72vh, 760px);
  min-height: 280px;
  background: var(--ant-color-fill-quaternary, #f5f5f5);
}
.receipt-print-preview iframe {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
