<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReportExportMode } from '../../../api/financeReport'
const props = defineProps<{
  permission: string
  detailOnly?: boolean
  state: { ready: boolean; loading: boolean; failed: boolean; exporting: boolean }
}>()
const emit = defineEmits<{ export: [format: 'excel' | 'pdf', preview: boolean, mode: ReportExportMode] }>()
const { t } = useI18n()
const open = ref(false),
  mode = ref<ReportExportMode>('CURRENT'),
  format = ref<'excel' | 'pdf'>('excel')
function submit(preview = false) {
  emit('export', format.value, preview, props.detailOnly ? 'CURRENT' : mode.value)
  open.value = false
}
</script>
<template>
  <j-permission-button
    :hasPermission="permission"
    :disabled="!state.ready || state.loading || state.failed || state.exporting"
    :loading="state.exporting"
    @click="open = true"
  >
    <AIcon type="DownloadOutlined" />
    {{ t('ReportUI.export') }}
  </j-permission-button>
  <a-modal
    v-model:visible="open"
    :title="t('ReportUI.exportTitle')"
    :width="520"
    :footer="null"
    :mask-closable="false"
  >
    <a-form layout="vertical">
      <a-form-item
        v-if="!detailOnly"
        :label="t('ReportUI.exportRange')"
      >
        <a-radio-group
          v-model:value="mode"
          class="report-export-options"
        >
          <a-radio
            v-for="key in ['CURRENT', 'DETAIL', 'BOTH'] as const"
            :key="key"
            :value="key"
          >
            {{ t('ReportUI.' + key) }}
          </a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item :label="t('ReportUI.format')">
        <a-radio-group
          v-model:value="format"
          button-style="solid"
        >
          <a-radio-button value="excel">Excel</a-radio-button>
          <a-radio-button value="pdf">PDF</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <p class="report-export-note">{{ t('ReportUI.exportNote') }}</p>
      <a-space class="report-export-footer">
        <a-button @click="open = false">{{ t('Finance.cancel') }}</a-button>
        <a-button
          v-if="format === 'pdf'"
          @click="submit(true)"
        >
          {{ t('Report.print') }}
        </a-button>
        <a-button
          type="primary"
          @click="submit()"
        >
          {{ t('ReportUI.download') }}
        </a-button>
      </a-space>
    </a-form>
  </a-modal>
</template>
<style scoped>
.report-export-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.report-export-note {
  color: var(--ant-color-text-secondary, #595959);
  line-height: 1.7;
  margin: 0 0 24px;
}
.report-export-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
