<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, toRef } from 'vue'
import type { DocumentRecord } from '../../../api/financeDocument'
import { getInvoicePdf } from '../../../api/financeDocument'
import { useReportExport } from '../../../hooks/finance-report/useReportExport'
defineOptions({ inheritAttrs: false })
const props = defineProps<{ projectId: string; document: DocumentRecord }>()
const { t } = useI18n()
const { exporting, previewUrl, previewOpen, closePreview, exportRows } = useReportExport({
  projectId: toRef(props, 'projectId'),
  enabled: () => !!props.projectId,
  input: () => ({ project: props.projectId, id: props.document.id }),
  title: () => `SIM-${props.document.documentNumber}`,
  fallback: () => t('Document.printFailed'),
  request: (input) => getInvoicePdf(input.project, input.id)
})
const frame = ref<HTMLIFrameElement>()
</script>
<template>
  <j-permission-button
    hasPermission="charging/FinanceInvoice:query"
    :loading="exporting"
    @click="exportRows('pdf', true)"
  >
    {{ t('Document.simulatedPreview') }}
  </j-permission-button>
  <a-modal
    :open="previewOpen"
    :title="t('Document.simulatedPreview')"
    :width="1120"
    @cancel="closePreview"
  >
    <iframe
      ref="frame"
      :src="previewUrl"
      :title="t('Document.simulatedPreview')"
      referrerpolicy="no-referrer"
      style="width: 100%; height: 65vh; border: 0"
    />
    <template #footer>
      <a-button @click="closePreview">{{ t('Finance.close') }}</a-button>
      <a-button @click="frame?.contentWindow?.print()">{{ t('Document.print') }}</a-button>
      <a-button
        :href="previewUrl"
        :download="`SIM-${document.documentNumber}.pdf`"
      >
        {{ t('Document.downloadPdf') }}
      </a-button>
    </template>
  </a-modal>
</template>
