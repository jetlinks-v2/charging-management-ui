<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReportRow } from '../../../api/financeReport'
import type { ReceivedRow } from '../../../api/financeReceivedReport'
import { reportDetail } from '../../../utils/reportDetail'
const props = defineProps<{ row: ReportRow | ReceivedRow; namespace: 'Report' | 'Received' }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()
const sections = computed(() => reportDetail(props.row, props.namespace, t))
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="880"
    icon="ProfileOutlined"
    :title="t('Finance.detail')"
    @update:open="$emit('close')"
  >
    <div class="report-row-detail">
      <a-descriptions
        :title="t('ReportUI.basicInfo')"
        bordered
        :column="2"
        size="small"
      >
        <a-descriptions-item
          v-for="field in sections.basic"
          :key="field.key"
          :label="['billNo', 'sourceNo'].includes(field.key) ? t('Document.billNo') : t(namespace + '.' + field.key)"
          :span="field.span"
        >
          <a-tag
            v-if="field.color"
            :color="field.color"
          >
            {{ field.text }}
          </a-tag>
          <span v-else>{{ field.text }}</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-descriptions
        :title="t('ReportUI.amountInfo')"
        bordered
        :column="2"
        size="small"
      >
        <a-descriptions-item
          v-for="field in sections.money"
          :key="field.key"
          :label="['billNo', 'sourceNo'].includes(field.key) ? t('Document.billNo') : t(namespace + '.' + field.key)"
        >
          <span class="report-detail-money">{{ field.text }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </div>
    <template #foot>
      <a-button @click="$emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.report-row-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.report-detail-money {
  font-variant-numeric: tabular-nums;
}
.report-row-detail :deep(.ant-descriptions-item-content) {
  overflow-wrap: anywhere;
}
</style>
