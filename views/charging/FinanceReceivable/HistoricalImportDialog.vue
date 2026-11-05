<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { validateImportFile } from '../../../utils/archiveImport'
const props = defineProps<{ open: boolean; projectName: string; busy: boolean }>()
const emit = defineEmits<{ close: []; template: []; upload: [File] }>()
const { t } = useI18n()
const file = ref<File>()
watch(
  () => props.open,
  () => {
    file.value = undefined
  }
)
function choose(selected: File) {
  const invalid = validateImportFile(selected)
  file.value = undefined
  if (invalid) onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'error')
  else file.value = selected
  return false
}
</script>
<template>
  <a-modal
    :open="open"
    :width="640"
    :style="{ maxWidth: 'calc(100vw - 32px)' }"
    :title="t('Historical.title')"
    :closable="!busy"
    :mask-closable="!busy"
    :keyboard="!busy"
    @cancel="emit('close')"
  >
    <div class="historical-import">
      <div class="historical-import__project">
        <AIcon type="ApartmentOutlined" />
        <span>{{ t('Archive.project') }}</span>
        <strong>{{ projectName }}</strong>
        <AIcon type="LockOutlined" />
      </div>
      <div class="historical-import__guide">
        <p>{{ t('Historical.guide') }}</p>
        <a-button :loading="busy" @click="emit('template')">
          <AIcon type="DownloadOutlined" /> {{ t('Subject.template') }}
        </a-button>
      </div>
      <a-upload-dragger
        accept=".xlsx,.xls"
        :multiple="false"
        :show-upload-list="false"
        :before-upload="choose"
        :disabled="busy"
      >
        <p class="ant-upload-drag-icon"><AIcon type="FileExcelOutlined" /></p>
        <p class="ant-upload-text">{{ t('Historical.dropFile') }}</p>
        <p class="ant-upload-hint">{{ t('Historical.fileHint') }}</p>
      </a-upload-dragger>
      <div v-if="file" class="historical-import__file" role="status">
        <AIcon type="FileExcelOutlined" />
        <span
          >{{ file.name }} <small>{{ (file.size / 1024).toFixed(1) }} KB</small></span
        >
        <a-button
          type="text"
          :disabled="busy"
          :aria-label="t('Historical.removeFile')"
          @click="file = undefined"
        >
          <AIcon type="DeleteOutlined" />
        </a-button>
      </div>
    </div>
    <template #footer>
      <a-button :disabled="busy" @click="emit('close')">{{ t('Finance.cancel') }}</a-button>
      <a-button type="primary" :disabled="!file" :loading="busy" @click="file && emit('upload', file)">
        {{ t('Historical.importStart') }}
      </a-button>
    </template>
  </a-modal>
</template>
<style scoped>
.historical-import {
  display: grid;
  gap: 18px;
}
.historical-import__project {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}
.historical-import__project strong {
  flex: 1;
}
.historical-import__guide p {
  color: #626b7d;
  line-height: 1.7;
}
.historical-import__file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e8eaee;
  border-radius: 6px;
}
.historical-import__file span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.historical-import__file small {
  color: #8c95a6;
  margin-left: 8px;
}
</style>
