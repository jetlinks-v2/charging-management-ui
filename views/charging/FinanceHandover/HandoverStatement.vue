<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getHandoverStatement, exportHandoverStatement, type HandoverStatement } from '../../../api/financeHandover'
import { useReportExport } from '../../../hooks/finance-report/useReportExport'
import ReportPdfPreview from '../components/ReportPdfPreview.vue'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; id: string }>(),
  emit = defineEmits<{ close: [] }>(),
  { t } = useI18n()
const statement = ref<HandoverStatement>(),
  loading = ref(true)
const { exportRows, exporting, previewUrl, previewOpen, closePreview } = useReportExport({
  projectId: toRef(props, 'projectId'),
  enabled: () => !!statement.value,
  input: () => props.id,
  title: () => t('Handover.statement'),
  fallback: () => t('Finance.failed'),
  request: (id, format) => exportHandoverStatement(props.projectId, id, format)
})
const columns = [
  'subjectName',
  'currentReceived',
  'otherReceived',
  'advanceReceived',
  'advanceRefund',
  'refund',
  'cashAmount',
  'internalAmount',
  'amount'
].map((key) => ({
  title: t('Handover.statementField.' + key),
  dataIndex: key,
  align: key === 'subjectName' ? ('left' as const) : ('right' as const)
}))
onMounted(async () => {
  try {
    statement.value = await getHandoverStatement(props.projectId, props.id)
  } catch (error) {
    onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1000"
    :title="t('Handover.statement')"
    @update:open="emit('close')"
  >
    <a-spin :spinning="loading">
      <template v-if="statement">
        <h3>{{ statement.detail.batch.handoverNo }}</h3>
        <p>{{ statement.detail.batch.closingDate }} · {{ statement.detail.batch.submittedBy }}</p>
        <a-alert
          type="info"
          :message="t('Handover.statementScope')"
        />
        <a-table
          row-key="subjectName"
          :data-source="statement.rows"
          :columns="columns"
          :pagination="false"
          :scroll="{ x: 850 }"
        />
      </template>
      <CloudEmpty
        v-else-if="!loading"
        :description="t('Finance.failed')"
      />
    </a-spin>
    <template #foot>
      <a-button
        :loading="exporting"
        @click="exportRows('pdf', true)"
      >
        {{ t('Handover.previewPrint') }}
      </a-button>
      <a-button
        :loading="exporting"
        @click="exportRows('excel')"
      >
        Excel
      </a-button>
      <a-button
        :loading="exporting"
        @click="exportRows('pdf')"
      >
        PDF
      </a-button>
    </template>
  </JlDrawerShell>
  <ReportPdfPreview
    v-if="previewOpen"
    :state="{ open: previewOpen, url: previewUrl, title: t('Handover.statement'), filename: t('Handover.statement') }"
    @close="closePreview"
  />
</template>
