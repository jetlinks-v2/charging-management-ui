<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import type { ReceivableLog } from '../../../api/financeReceivable'
const props = defineProps<{ row: ReceivableLog }>()
const { t } = useI18n()
const fields = [
  'actualReceivableAmount',
  'adjustmentAmount',
  'assessmentAmount',
  'temporaryDispatchAmount',
  'feeReductionAmount',
  'finalLateFeeAmount',
  'lateFeeReductionAmount'
] as const
const changes = computed(() =>
  fields
    .filter((key) => props.row.before[key] !== props.row.after[key])
    .map((key) => ({
      label: t('Receivable.' + key),
      value: `${props.row.before[key] ?? '—'} → ${props.row.after[key] ?? '—'}`
    }))
)
const files = computed(() =>
  (props.row.detail?.input?.attachmentFileIds || []).map((id) => ({
    uid: id,
    name: props.row.detail?.input?.attachmentNames?.[id] || t('Adjustment.evidence'),
    status: 'done' as const,
    response: { result: { id } }
  }))
)
</script>
<template>
  <a-collapse
    v-if="row.operation === 'ADJUST'"
    ghost
  >
    <a-collapse-panel
      key="changes"
      :header="t('Adjustment.comparison')"
    >
      <KvGrid :items="changes" />
      <p
        v-if="row.detail?.input?.lateFeeReductionReason"
        class="receivable-log-reason"
      >
        {{ t('Adjustment.lateReason') }}：{{ row.detail.input.lateFeeReductionReason }}
      </p>
      <p
        v-if="row.detail?.input?.remark"
        class="receivable-log-reason"
      >
        {{ row.detail.input.remark }}
      </p>
      <FileUpload
        v-if="files.length"
        :value="files"
        disabled
        :is-upload="false"
      >
        <span />
      </FileUpload>
    </a-collapse-panel>
  </a-collapse>
  <a-collapse
    v-else-if="row.operation === 'SPLIT'"
    ghost
  >
    <a-collapse-panel
      key="parts"
      :header="t('Split.title')"
    >
      <div
        v-for="part in row.detail?.children"
        :key="part.id"
        class="split-log-part"
      >
        <strong>{{ part.customerName }} · {{ part.amount }} {{ t('Split.yuan') }}</strong>
        <p>{{ part.start }} ～ {{ part.end }}</p>
      </div>
    </a-collapse-panel>
  </a-collapse>
</template>
