<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryReportDocuments, type InvoiceRow, type ReportDocument } from '../../../api/financeInvoiceReport'
import { getDocument, type DocumentDetail } from '../../../api/financeDocument'
import { requestErrorMessage } from '../../../utils/requestError'
import DocumentSnapshot from '../FinanceDocument/DocumentSnapshot.vue'
const props = defineProps<{ row: InvoiceRow }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()
const documents = ref<ReportDocument[]>([]),
  selected = ref<DocumentDetail>(),
  loading = ref(false)
let generation = 0
onScopeDispose(() => {
  ++generation
})
watch(
  () => props.row,
  async (row) => {
    const token = ++generation
    selected.value = undefined
    documents.value = []
    loading.value = true
    try {
      if (!row.projectId || !row.sourceType || !row.id) return
      const result = await queryReportDocuments(row.projectId, row.sourceType, row.id)
      if (token === generation) documents.value = result
    } catch (error) {
      if (token === generation) onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    } finally {
      if (token === generation) loading.value = false
    }
  },
  { immediate: true }
)
async function select(id: string) {
  if (!props.row.projectId) return
  const token = ++generation
  selected.value = undefined
  loading.value = true
  try {
    const result = await getDocument(props.row.projectId, 'INVOICE', id)
    if (token === generation) selected.value = result
  } catch (error) {
    if (token === generation) onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  } finally {
    if (token === generation) loading.value = false
  }
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="FileTextOutlined"
    :title="t('InvoiceReport.relatedDocuments')"
    @update:open="$emit('close')"
  >
    <a-descriptions
      bordered
      :column="2"
      size="small"
    >
      <a-descriptions-item :label="t('InvoiceReport.id')">{{ row.id }}</a-descriptions-item>
      <a-descriptions-item :label="t('InvoiceReport.fullName')">{{ row.fullName }}</a-descriptions-item>
      <a-descriptions-item :label="t('InvoiceReport.invoiceContent')">
        {{ row.invoiceContent || '—' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('InvoiceReport.remark')">{{ row.remark || '—' }}</a-descriptions-item>
    </a-descriptions>
    <a-spin :spinning="loading">
      <a-table
        :data-source="documents"
        row-key="id"
        :pagination="false"
        :scroll="{ x: 900 }"
        size="small"
        class="related-documents"
      >
        <a-table-column
          key="documentNumber"
          :title="t('Document.documentNumber')"
        >
          <template #default="{ record }">
            <a-button
              type="link"
              @click="select(record.id)"
            >
              {{ record.documentNumber }}
            </a-button>
          </template>
        </a-table-column>
        <a-table-column
          key="status"
          :title="t('Document.status')"
        >
          <template #default="{ record }">{{ t('Document.' + record.status) }}</template>
        </a-table-column>
        <a-table-column
          key="issuedAt"
          data-index="issuedAt"
          :title="t('InvoiceReport.invoiceDate')"
        >
          <template #default="{ record }">{{ formatFinanceTime(record.issuedAt) }}</template>
        </a-table-column>
        <a-table-column
          key="amount"
          data-index="amount"
          :title="t('Document.amount')"
          align="right"
        />
      </a-table>
      <DocumentSnapshot
        v-if="selected"
        :value="selected"
      />
    </a-spin>
    <template #foot>
      <a-button @click="$emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.related-documents {
  margin: 16px 0;
}
</style>
