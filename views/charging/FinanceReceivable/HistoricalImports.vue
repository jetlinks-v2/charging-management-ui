<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHistoricalImport } from '../../../hooks/finance-receivable/useHistoricalImport'
import ArchiveImportDialog from '../components/ArchiveImportDialog.vue'
const props = defineProps<{ projectId: string; projectName: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const { open, historyOpen, busy, table, params, selected, template, upload, request, notify } = useHistoricalImport(
  props,
  () => emit('saved')
)
const columns = computed(() => [
  { title: t('Subject.importStatus'), dataIndex: 'status', width: 110, scopedSlots: true },
  { title: t('Subject.fileName'), dataIndex: 'fileName', width: 240, ellipsis: true },
  { title: t('Subject.totalRows'), dataIndex: 'totalCount', width: 90 },
  { title: t('Subject.successRows'), dataIndex: 'successCount', width: 90 },
  { title: t('Subject.importedBy'), dataIndex: 'operatorName', width: 130 },
  { title: t('Subject.importTime'), dataIndex: 'createTime', width: 175, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 90, fixed: 'right', scopedSlots: true }
])
</script>
<template>
  <a-space>
    <j-permission-button
      :hasPermission="'charging/FinanceReceivable:imports'"
      :disabled="!projectId"
      @click="historyOpen = true"
    >
      <AIcon type="HistoryOutlined" />
      {{ t('Subject.importHistory') }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="'charging/FinanceReceivable:import'"
      :disabled="!projectId"
      @click="open = true"
    >
      <AIcon type="UploadOutlined" />
      {{ t('Historical.title') }}
    </j-permission-button>
  </a-space>
  <ArchiveImportDialog
    :open="open"
    :project-name="projectName"
    kind="house"
    :busy="busy"
    :title="t('Historical.title')"
    :guide-text="t('Historical.guide')"
    :file-hint="t('Historical.fileHint')"
    @close="open = false"
    @template="template"
    @upload="upload"
  />
  <JlDrawerShell
    :open="historyOpen"
    :width="1080"
    icon="HistoryOutlined"
    :title="t('Historical.history')"
    @update:open="historyOpen = false"
  >
    <div class="history-heading">
      <span>{{ projectName }}</span>
      <a-button @click="table?.reload()">
        <AIcon type="ReloadOutlined" />
        {{ t('Finance.refresh') }}
      </a-button>
    </div>
    <j-pro-table
      ref="table"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :params="params"
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :scroll="{ x: 925 }"
      :alert-show="false"
      @request-error="notify"
    >
      <template #status="row">
        <a-tag :color="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'processing'">
          {{ t('Subject.importState.' + row.status) }}
        </a-tag>
      </template>
      <template #createTime="row">{{ new Date(row.createTime).toLocaleString() }}</template>
      <template #actions="row">
        <a-button
          type="link"
          @click="selected = row"
        >
          {{ t('Finance.detail') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty :description="t('Subject.noImportHistory')" /></template>
    </j-pro-table>
  </JlDrawerShell>
  <a-modal
    :open="!!selected"
    :title="t('Historical.result')"
    :width="600"
    :style="{ maxWidth: 'calc(100vw - 32px)' }"
    :footer="null"
    @cancel="selected = undefined"
  >
    <template v-if="selected">
      <a-descriptions
        :column="1"
        size="small"
      >
        <a-descriptions-item :label="t('Subject.fileName')">{{ selected.fileName }}</a-descriptions-item>
        <a-descriptions-item :label="t('Subject.importStatus')">
          <a-tag
            :color="selected.status === 'FAILED' ? 'error' : selected.status === 'SUCCESS' ? 'success' : 'processing'"
          >
            {{ t('Subject.importState.' + selected.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item :label="t('Subject.totalRows')">{{ selected.totalCount }}</a-descriptions-item>
        <a-descriptions-item :label="t('Subject.successRows')">{{ selected.successCount }}</a-descriptions-item>
        <a-descriptions-item :label="t('Subject.finishTime')">
          {{ selected.finishTime ? new Date(selected.finishTime).toLocaleString() : '—' }}
        </a-descriptions-item>
      </a-descriptions>
      <div
        v-if="selected.errorMessage"
        class="history-error"
      >
        <strong>{{ t('Subject.failureDetails') }}</strong>
        <p>{{ selected.errorMessage }}</p>
        <small>{{ t('Historical.noWrites') }}</small>
      </div>
    </template>
  </a-modal>
</template>
<style scoped>
.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.history-error {
  margin-top: 20px;
  padding: 16px;
  background: var(--ant-error-color-deprecated-bg, #fff2f0);
  border-radius: 6px;
  overflow-wrap: anywhere;
}
.history-error p {
  white-space: pre-wrap;
  margin: 8px 0;
}
.history-error small {
  color: var(--ant-text-color-secondary, #595959);
}
</style>
