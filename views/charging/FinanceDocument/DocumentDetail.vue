<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useDocumentWorkspace } from '../../../hooks/finance-document/useDocumentWorkspace'
import DocumentSnapshot from './DocumentSnapshot.vue'
import DocumentLogs from './DocumentLogs.vue'
const props = defineProps<{ state: ReturnType<typeof useDocumentWorkspace> }>()
const { t } = useI18n()
const { projectId, detail, loading, failed, closeDetail } = props.state
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="FileTextOutlined"
    :title="t('Document.detail')"
    @update:open="closeDetail"
  >
    <a-spin :spinning="loading">
      <div
        v-if="detail"
        class="document-editor"
      >
        <DocumentSnapshot :value="detail" />
        <DocumentLogs
          :key="detail.document.id"
          :project-id="projectId"
          :document="detail.document"
        />
      </div>
      <CloudEmpty
        v-else-if="!loading"
        :description="t(failed ? 'Finance.failed' : 'Document.empty')"
      />
    </a-spin>
    <template #foot>
      <a-button @click="closeDetail">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
