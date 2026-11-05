<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useSubjectExcel } from '../../../hooks/finance-subject/useSubjectExcel'
import { subjectPermission } from '../../../hooks/finance-subject/useSubjectCatalog'
const props = defineProps<{ state: ReturnType<typeof useSubjectExcel> }>()
const emit = defineEmits<{ history: [] }>()
const { t } = useI18n()
const { importOpen, file, busy, closeImport, chooseFile, submitImport, template } = props.state
</script>
<template>
  <a-modal
    :open="importOpen"
    :title="t('Subject.importTitle')"
    :width="680"
    :closable="!busy"
    :mask-closable="!busy"
    :keyboard="!busy"
    @cancel="closeImport"
  >
    <a-form
      class="subject-import-form"
      layout="vertical"
    >
      <a-form-item :label="t('Subject.template')">
        <a-button
          type="link"
          :disabled="busy"
          class="subject-template-link"
          @click="template"
        >
          <AIcon type="DownloadOutlined" />
          {{ t('Subject.templateFile') }}.xlsx
        </a-button>
      </a-form-item>
      <a-form-item
        :label="t('Subject.chooseFile')"
        required
      >
        <a-upload-dragger
          accept=".xls,.xlsx"
          :multiple="false"
          :max-count="1"
          :disabled="busy"
          :before-upload="chooseFile"
          :file-list="file ? [{ uid: 'subject-import', name: file.name, status: 'done' }] : []"
          @remove="file = undefined"
        >
          <p class="ant-upload-drag-icon"><AIcon type="InboxOutlined" /></p>
          <p class="ant-upload-text">{{ t('Subject.dropFile') }}</p>
          <p class="ant-upload-hint">{{ t('Subject.excelOnly') }}</p>
        </a-upload-dragger>
      </a-form-item>
      <p class="subject-import-hint">{{ t('Subject.importHint') }}</p>
    </a-form>
    <template #footer>
      <div class="subject-import-footer">
        <j-permission-button
          :hasPermission="`${subjectPermission}:imports`"
          :disabled="busy"
          @click="emit('history')"
        >
          {{ t('Subject.importHistory') }}
        </j-permission-button>
        <a-space>
          <a-button
            :disabled="busy"
            @click="closeImport"
          >
            {{ t('Finance.cancel') }}
          </a-button>
          <j-permission-button
            :hasPermission="`${subjectPermission}:import`"
            type="primary"
            :loading="busy"
            :disabled="!file || busy"
            @click="submitImport"
          >
            {{ t('Subject.parseImport') }}
          </j-permission-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>
<style scoped>
.subject-import-form {
  padding-top: 16px;
}
.subject-template-link {
  padding-left: 0;
}
.subject-import-hint {
  color: var(--ink-3, #595959);
  line-height: 1.7;
  margin-bottom: 8px;
}
.subject-import-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
