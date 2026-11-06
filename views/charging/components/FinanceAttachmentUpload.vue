<script setup lang="ts">
import type { UploadChangeParam } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'

withDefaults(defineProps<{
  value: UploadChangeParam['fileList']
  maxCount?: number
  disabled?: boolean
}>(), { maxCount: 1, disabled: false })
const emit = defineEmits<{ uploadChange: [info: UploadChangeParam] }>()
const { t } = useI18n()
</script>

<template>
  <FileUpload
    :value="value"
    :size="20"
    :max-count="maxCount"
    :multiple="maxCount > 1"
    :disabled="disabled"
    drag
    @upload-change="emit('uploadChange', $event)"
  >
    <div class="finance-attachment-dropzone">
      <AIcon type="InboxOutlined" />
      <div>
        <div class="finance-attachment-title">{{ t('FinanceAttachment.upload') }}</div>
        <div class="finance-attachment-hint">{{ t('FinanceAttachment.hint', { count: maxCount }) }}</div>
      </div>
    </div>
  </FileUpload>
</template>

<style scoped>
.finance-attachment-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  text-align: left;
}
.finance-attachment-dropzone > .anticon {
  color: var(--ant-color-primary, #1677ff);
  font-size: 32px;
}
.finance-attachment-title {
  font-weight: 500;
}
.finance-attachment-hint {
  margin-top: 6px;
  color: var(--ant-color-text-secondary, #666);
  font-size: 12px;
}
</style>
