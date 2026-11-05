<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FundPreview, FundInput } from '../../../api/financeFunds'
const props = defineProps<{ preview: FundPreview; items: NonNullable<FundInput['items']> }>()
const { t } = useI18n()
const rows = computed(() =>
  props.preview.bills.map((bill) => ({ ...bill, offset: props.items.find((item) => item.id === bill.id)?.amount }))
)
const columns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Receivable.calcStartDate'), dataIndex: 'calcStartDate', width: 130 },
  { title: t('Receivable.calcEndDate'), dataIndex: 'calcEndDate', width: 130 },
  { title: t('Receivable.arrears'), dataIndex: 'arrears', width: 130, align: 'right' },
  { title: t('Funds.offsetAmount'), dataIndex: 'offset', width: 140, align: 'right' }
])
</script>
<template>
  <SectionCard
    icon="AccountBookOutlined"
    :title="t('Funds.bills')"
  >
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      :pagination="false"
      :scroll="{ x: 530 }"
    />
  </SectionCard>
</template>
