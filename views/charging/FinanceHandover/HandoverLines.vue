<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HandoverLine } from '../../../api/financeHandover'
defineProps<{ lines: HandoverLine[] }>()
const { t } = useI18n()
const columns = computed(() => [
  { title: t('Handover.space'), dataIndex: 'fullName', width: 260 },
  { title: t('Handover.customer'), dataIndex: 'customerName', width: 130 },
  { title: t('Handover.subject'), dataIndex: 'subjectName', width: 140 },
  { title: t('Handover.method'), dataIndex: 'methodText', width: 120 },
  { title: t('Handover.amount'), dataIndex: 'amount', width: 130, align: 'right' as const },
  { title: t('Handover.cash'), dataIndex: 'cashAmount', width: 130, align: 'right' as const }
])
</script>
<template>
  <a-table
    size="small"
    :columns="columns"
    :data-source="lines"
    :row-key="(row: HandoverLine) => row.sourceType + ':' + row.originalLineId"
    :scroll="{ x: 910 }"
    :pagination="{ pageSize: 10, showSizeChanger: true }"
  />
</template>
