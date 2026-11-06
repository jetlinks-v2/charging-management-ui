<script setup lang="ts">
import type { CollectionImportKind } from '../../../api/financeCollectionImport'
import { useCollectionImport } from '../../../hooks/finance-import/useCollectionImport'
import HistoricalImportDialog from '../FinanceReceivable/HistoricalImportDialog.vue'
import HistoricalImportAudit from '../FinanceReceivable/HistoricalImportAudit.vue'
const props = defineProps<{ projectId: string; projectName: string; kind: CollectionImportKind; permission: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t, open, historyOpen, readonly, status, busy, history, template, upload } = useCollectionImport(props)
</script>
<template>
  <a-space
    wrap
    style="margin-bottom: 16px"
  >
    <j-permission-button
      :hasPermission="`${permission}:import`"
      :disabled="!projectId"
      @click="open = true"
    >
      <AIcon type="UploadOutlined" />
      {{ t('CollectionImport.kinds.' + kind) }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="`${permission}:imports`"
      :disabled="!projectId"
      @click="history(false)"
    >
      <AIcon type="HistoryOutlined" />
      {{ t('HistoricalAudit.history') }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="`${permission}:imports`"
      :disabled="!projectId"
      @click="history(true)"
    >
      <AIcon type="AuditOutlined" />
      {{ t('HistoricalAudit.button') }}
    </j-permission-button>
  </a-space>
  <HistoricalImportDialog
    :open="open"
    :project-name="projectName"
    :busy="busy"
    :title="t('CollectionImport.kinds.' + kind)"
    :permission="permission"
    collection
    @close="open = false"
    @template="template"
    @upload="upload"
    @history="history(false)"
  />
  <HistoricalImportAudit
    v-if="historyOpen"
    :open="historyOpen"
    :project-id="projectId"
    :initial-status="status"
    :readonly="readonly"
    :kind="kind"
    :permission="permission"
    @close="historyOpen = false"
    @saved="emit('saved')"
  />
</template>
