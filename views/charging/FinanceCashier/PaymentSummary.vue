<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageUrl } from '@jetlinks-web-core/utils'
import { FileUpload } from '@jetlinks-web-core/components'
import type { PaymentDetail } from '../../../api/financeCashier'
const props = defineProps<{ detail: PaymentDetail }>()
const { t } = useI18n()
const items = computed(() => [
  { label: t('Cashier.company'), value: props.detail.payment.companyName },
  { label: t('Cashier.payer'), value: props.detail.payment.payerName },
  { label: t('Cashier.paidAt'), value: props.detail.payment.paidAt.replace('T', ' ') },
  { label: t('Cashier.operator'), value: props.detail.payment.modifierName || '—' },
  { label: t('Setting.remark'), value: props.detail.payment.remark || '—' },
  { label: t('Cashier.paymentId'), value: props.detail.payment.id }
])
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240 },
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 160 },
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 120 },
  { title: t('Cashier.method'), dataIndex: 'methodText', width: 130 },
  { title: t('Cashier.bank'), dataIndex: 'bankName', width: 150 },
  { title: t('Cashier.amount'), dataIndex: 'amount', width: 130 },
  { title: t('Cashier.refunded'), dataIndex: 'refundedAmount', width: 130 }
])
const files = computed(() =>
  props.detail.payment.attachmentFileId
    ? [
        {
          uid: props.detail.payment.attachmentFileId,
          name: props.detail.payment.attachmentName || '',
          status: 'done' as const,
          url: getImageUrl(props.detail.payment.attachmentFileId)
        }
      ]
    : []
)
</script>
<template>
  <div class="cashier-success">
    <AIcon type="CheckCircleFilled" />
    <div>
      <span>{{ t('Cashier.succeeded') }}</span>
      <strong class="cashier-money">{{ detail.payment.amount }}</strong>
    </div>
  </div>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Cashier.paymentInfo')"
  >
    <KvGrid
      :items="items"
      :cols="2"
    />
  </SectionCard>
  <SectionCard
    icon="UnorderedListOutlined"
    :title="t('Cashier.allocationDetails')"
  >
    <a-table
      :data-source="detail.lines"
      :columns="columns"
      row-key="id"
      :pagination="false"
      size="small"
      :scroll="{ x: 1060 }"
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
