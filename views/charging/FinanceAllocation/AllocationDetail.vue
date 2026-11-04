<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { AllocationBook } from '../../../api/financeAllocation'
const props = defineProps<{ row: AllocationBook }>()
const { t } = useI18n()
const basic = computed(() =>
  ['recipientName', 'buyDate', 'billTypeName', 'billCode', 'billSourceName', 'quota'].map((k) => ({
    label: t('Allocation.' + k),
    value: props.row[k as keyof AllocationBook] ?? '—'
  }))
)
</script>
<template>
  <div class="allocation-sections">
    <div class="allocation-summary">
      <a-tag :color="row.enabled && !row.recovered ? 'green' : undefined">
        {{
          t(row.recovered ? 'Allocation.isRecovered' : row.enabled ? 'Allocation.isEnabled' : 'Allocation.isDisabled')
        }}
      </a-tag>
      <span class="allocation-range">{{ row.startNumber }} — {{ row.endNumber }}</span>
    </div>
    <SectionCard
      icon="UserOutlined"
      :title="t('Allocation.recipientSection')"
    >
      <KvGrid
        :cols="2"
        :items="basic"
      />
    </SectionCard>
    <SectionCard
      icon="NumberOutlined"
      :title="t('Allocation.rangeSection')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Allocation.numberCount'), value: row.numberCount },
          {
            label: t('Allocation.available'),
            value: row.enabled && !row.recovered ? row.numberCount - row.usedCount - row.discardedCount : 0
          },
          { label: t('Allocation.used'), value: row.usedCount },
          { label: t('Allocation.discarded'), value: row.discardedCount }
        ]"
      />
    </SectionCard>
    <SectionCard
      icon="AuditOutlined"
      :title="t('Allocation.registration')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Allocation.batchNumber'), value: row.batchNumber },
          { label: t('Allocation.creatorName'), value: row.creatorName },
          { label: t('Allocation.createTime'), value: dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') },
          { label: t('Allocation.remark'), value: row.remark || '—' }
        ]"
      />
    </SectionCard>
  </div>
</template>
