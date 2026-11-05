<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useHistoricalImport } from '../../../hooks/finance-receivable/useHistoricalImport'
import HistoricalImportDialog from './HistoricalImportDialog.vue'
import HistoricalImportAudit from './HistoricalImportAudit.vue'
const props = defineProps<{ projectId: string; projectName: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const { open, historyOpen, historyStatus, showHistory, busy, template, upload } = useHistoricalImport(props, () =>
  emit('saved')
)
</script>
<template>
  <a-space wrap>
    <j-permission-button
      :hasPermission="'charging/FinanceReceivable:import'"
      :disabled="!projectId"
      @click="open = true"
    >
      <AIcon type="UploadOutlined" />
      {{ t('Historical.title') }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="'charging/FinanceReceivable:imports'"
      :disabled="!projectId"
      @click="showHistory('PENDING')"
    >
      <AIcon type="AuditOutlined" />
      {{ t('HistoricalAudit.button') }}
    </j-permission-button>
  </a-space>
  <HistoricalImportDialog
    :open="open"
    :project-name="projectName"
    :busy="busy"
    @close="open = false"
    @template="template"
    @upload="upload"
    @history="showHistory('ALL')"
  />
  <HistoricalImportAudit
    :open="historyOpen"
    :project-id="projectId"
    :initial-status="historyStatus"
    @close="historyOpen = false"
    @saved="emit('saved')"
  />
</template>
