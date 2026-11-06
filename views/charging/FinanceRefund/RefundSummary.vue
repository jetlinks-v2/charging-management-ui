<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import { getImageUrl } from '@jetlinks-web-core/utils'
import type { RefundDetail } from '../../../api/financeRefund'
const props = defineProps<{ detail: RefundDetail }>()
const { t } = useI18n()
const items = computed(() => [
  { label: t('Cashier.company'), value: props.detail.refund.companyName },
  { label: t('Refund.receiver'), value: props.detail.refund.receiverName },
  { label: t('Refund.refundedAt'), value: formatFinanceTime(props.detail.refund.refundedAt) },
  { label: t('Refund.method'), value: props.detail.refund.methodText },
  { label: t('Cashier.bank'), value: props.detail.refund.bankName || '—' },
  { label: t('Cashier.operator'), value: props.detail.refund.modifierName || '—' },
  { label: t('Refund.reason'), value: props.detail.refund.reason },
  { label: t('Refund.refundId'), value: props.detail.refund.id }
])
const columns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240 },
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 130 },
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 150 },
  { title: t('Refund.amount'), dataIndex: 'amount', width: 130, align: 'right' },
  { title: t('Cashier.paymentId'), dataIndex: 'paymentId', width: 300 }
])
const files = computed(() =>
  props.detail.refund.attachmentFileId
    ? [
        {
          uid: props.detail.refund.attachmentFileId,
          name: props.detail.refund.attachmentName || '',
          status: 'done' as const,
          url: getImageUrl(props.detail.refund.attachmentFileId)
        }
      ]
    : []
)
</script>
<template>
  <div class="cashier-success">
    <AIcon type="CheckCircleFilled" />
    <div>
      <span>{{ t('Refund.succeeded') }}</span>
      <strong class="cashier-money">{{ detail.refund.amount }}</strong>
    </div>
  </div>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Refund.info')"
  >
    <KvGrid
      :items="items"
      :cols="2"
    />
  </SectionCard>
  <SectionCard
    icon="UnorderedListOutlined"
    :title="t('Refund.sources')"
  >
    <a-table
      :columns="columns"
      :data-source="detail.lines"
      row-key="id"
      size="small"
      :pagination="false"
      :scroll="{ x: 950 }"
    />
  </SectionCard>
  <SectionCard
    v-if="files.length"
    icon="PaperClipOutlined"
    :title="t('Cashier.evidence')"
  >
    <FileUpload
      :value="files"
      disabled
    >
      <span />
    </FileUpload>
  </SectionCard>
</template>
