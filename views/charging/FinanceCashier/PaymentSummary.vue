<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageUrl } from '@jetlinks-web-core/utils'
import { FileUpload } from '@jetlinks-web-core/components'
import type { PaymentDetail } from '../../../api/financeCashier'
const props = defineProps<{ detail: PaymentDetail }>()
const { t } = useI18n()
const items = computed(() => [
  {
    label: t('Temporary.sourceLabel'),
    value: t(props.detail.payment.sourceType === 'TEMPORARY' ? 'Temporary.source' : 'Temporary.receivable')
  },
  { label: t('Cashier.company'), value: props.detail.payment.companyName },
  { label: t('Cashier.payer'), value: props.detail.payment.payerName },
  { label: t('Cashier.paidAt'), value: formatFinanceTime(props.detail.payment.paidAt) },
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
    v-if="detail.payment.sourceType === 'TEMPORARY' && detail.snapshot"
    icon="HomeOutlined"
    :title="t('Temporary.basis')"
  >
    <KvGrid
      :cols="2"
      :items="[
        { label: t('Setting.house'), value: detail.snapshot.house?.fullName },
        { label: t('Setting.customer'), value: detail.snapshot.customer?.name },
        { label: t('Setting.subject'), value: detail.snapshot.standard?.subjectName },
        { label: t('Setting.standard'), value: detail.snapshot.standard?.standardName },
        { label: t('Temporary.startDate'), value: detail.snapshot.startDate },
        { label: t('Temporary.endDate'), value: detail.snapshot.endDate },
        { label: t('Temporary.accountPeriod'), value: detail.snapshot.accountPeriod },
        { label: t('Funds.quantity'), value: detail.snapshot.quantity || '—' }
      ]"
    />
  </SectionCard>
  <SectionCard
    icon="UnorderedListOutlined"
    :title="t(detail.payment.sourceType === 'TEMPORARY' ? 'Temporary.fundingDetails' : 'Cashier.allocationDetails')"
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
