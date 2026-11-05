<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReportRow } from '../../../api/financeReport'
import type { ReceivedRow } from '../../../api/financeReceivedReport'
const props = defineProps<{ row: ReportRow | ReceivedRow; namespace: 'Report' | 'Received' }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()
const fields = computed(() =>
  Object.entries(props.row).flatMap(([key, value]) =>
    key === 'amounts'
      ? Object.entries(value)
      : !['projectId', 'spaceId', 'subjectId', 'rowCount', 'billCount'].includes(key)
        ? [[key, value]]
        : []
  )
)
const display = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  if (['sourceType', 'collectionStatus'].includes(key)) return t(props.namespace + '.' + String(value))
  return String(value)
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="880"
    icon="ProfileOutlined"
    :title="t('Finance.detail')"
    @update:open="$emit('close')"
  >
    <a-descriptions
      bordered
      :column="2"
      size="small"
    >
      <a-descriptions-item
        v-for="[key, value] in fields"
        :key="String(key)"
        :label="t(namespace + '.' + key)"
      >
        {{ display(String(key), value) }}
      </a-descriptions-item>
    </a-descriptions>
    <template #foot>
      <a-button @click="$emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
