<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{ permission: string; state: { ready: boolean; loading: boolean; failed: boolean; exporting: boolean } }>()
defineEmits<{ export: [format: 'excel' | 'pdf', preview?: boolean]; refresh: [] }>()
const { t } = useI18n()
</script>
<template>
  <a-space wrap>
    <j-permission-button
      :hasPermission="permission"
      :disabled="!state.ready || state.loading || state.failed"
      :loading="state.exporting"
      @click="$emit('export', 'excel')"
    >
      <AIcon type="DownloadOutlined" />
      {{ t('Report.excel') }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="permission"
      :disabled="!state.ready || state.loading || state.failed || state.exporting"
      @click="$emit('export', 'pdf')"
    >
      {{ t('Report.pdf') }}
    </j-permission-button>
    <j-permission-button
      :hasPermission="permission"
      :disabled="!state.ready || state.loading || state.failed || state.exporting"
      @click="$emit('export', 'pdf', true)"
    >
      <AIcon type="PrinterOutlined" />
      {{ t('Report.print') }}
    </j-permission-button>
    <a-button
      :disabled="state.exporting"
      @click="$emit('refresh')"
    >
      <AIcon type="ReloadOutlined" />
      {{ t('Finance.refresh') }}
    </a-button>
  </a-space>
</template>
