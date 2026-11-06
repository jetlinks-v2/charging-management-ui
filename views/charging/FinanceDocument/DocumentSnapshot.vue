<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageUrl } from '@jetlinks-web-core/utils'
import type { DocumentPreview, DocumentDetail, DocumentBuyer, DocumentPreviewLine } from '../../../api/financeDocument'
const props = defineProps<{ value: DocumentPreview | DocumentDetail }>()
const { t } = useI18n()
const preview = computed(() => ('token' in props.value ? props.value : undefined))
const record = computed(() => ('document' in props.value ? props.value.document : undefined))
const summary = computed(() => preview.value || record.value!)
const lines = computed(() => ('token' in props.value ? props.value.lines : props.value.lines.map((v) => v.snapshot)))
const buyerItems = computed(() =>
  (
    [
      'name',
      'taxNum',
      'phone',
      'email',
      'address',
      'depositBank',
      'bankAccount',
      'extensionNumber'
    ] as (keyof DocumentBuyer)[]
  )
    .map((key) => ({ label: t('Document.buyer.' + key), value: props.value.buyer[key] || '—' }))
    .concat([
      {
        label: t('Document.buyer.titleType'),
        value: props.value.buyer.titleType
          ? t('Document.titleType.' + props.value.buyer.titleType)
          : t('Document.paymentStates.UNKNOWN')
      }
    ])
)
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 220 },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 150 },
  { title: t('Document.source'), dataIndex: 'sourceId', width: 210 },
  { title: t('Document.standard'), dataIndex: 'standardName', width: 150 },
  {
    title: t('Document.period'),
    dataIndex: 'startDate',
    width: 210,
    customRender: ({ record: line }: { record: DocumentPreviewLine }) =>
      `${line.startDate || '—'} ~ ${line.endDate || '—'}`
  },
  { title: t('Document.issuePaidAmount'), dataIndex: 'paidAmount', width: 130 },
  { title: t('Document.goodsName'), dataIndex: 'goodsName', width: 150 },
  {
    title: t('Document.collectionMethod'),
    dataIndex: 'collectionMethod',
    width: 130,
    customRender: ({ text }: { text: string }) => t('Document.method.' + text)
  },
  { title: t('Document.issueAmount'), dataIndex: 'amount', width: 130, align: 'right' as const },
  { title: t('Document.taxRate'), dataIndex: 'taxRate', width: 110 },
  { title: t('Document.taxAmount'), dataIndex: 'taxAmount', width: 120, align: 'right' as const },
  { title: t('Document.netAmount'), dataIndex: 'netAmount', width: 130, align: 'right' as const },
  { title: t('Document.differenceAmount'), dataIndex: 'differenceAmount', width: 130, align: 'right' as const }
])
const sourceKey = (row: { sourceType: string; sourceId: string }) => `${row.sourceType}:${row.sourceId}`
</script>
<template>
  <div class="document-amount-band">
    <div>
      <span>{{ t('Document.total') }}</span>
      <strong class="document-money">{{ summary.amount }}</strong>
    </div>
    <a-tag :color="summary.documentType === 'INVOICE' ? 'warning' : 'processing'">
      {{ t(summary.documentType === 'INVOICE' ? 'Document.simulated' : 'Document.internal') }}
    </a-tag>
  </div>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Document.documentInfo')"
  >
    <KvGrid
      :cols="2"
      :items="[
        { label: t('Document.number'), value: record?.documentNumber || t('Document.unissued') },
        { label: t('Document.state'), value: record ? t('Document.status.' + record.status) : t('Document.ready') },
        { label: t('Document.seller'), value: summary.companyName },
        { label: t('Document.sellerTaxNum'), value: summary.sellerTaxNum },
        {
          label: t('Document.ruleSnapshot'),
          value:
            t('Document.rule.' + value.rule.timeLimitType) + (value.rule.limitDays ? ' / ' + value.rule.limitDays : '')
        },
        { label: t('Setting.customer'), value: summary.customerName },
        { label: t('Document.sceneTitle'), value: t('Document.scene.' + summary.issueScene) },
        ...(record
          ? [
              {
                label: t('Document.paymentStatus'),
                value: t('Document.paymentStates.' + (record.paymentStatus || 'UNKNOWN'))
              },
              { label: t('Document.paidAmount'), value: record.paidAmount ?? '—' },
              {
                label: t('Document.issuePaymentStatus'),
                value: t('Document.paymentStates.' + (record.issuePaymentStatus || 'UNKNOWN'))
              },
              { label: t('Document.issuePaidAmount'), value: record.issuePaidAmount ?? '—' },
              { label: t('Document.issuerName'), value: record.issuerName || '—' }
            ]
          : []),
        { label: t('Document.issuedAt'), value: formatFinanceTime(record?.issuedAt || preview?.businessDate) },
        ...(record?.documentType === 'INVOICE'
          ? [{ label: t('Document.reopenCount'), value: String(record.reopenCount || 0) }]
          : []),
        {
          label: t('Document.invoiceType'),
          value: summary.invoiceType ? t('Document.invoiceType' + summary.invoiceType) : '—'
        }
      ]"
    />
  </SectionCard>
  <SectionCard
    v-if="record?.documentType === 'RECEIPT'"
    icon="CheckCircleOutlined"
    :title="t('Verification.state')"
  >
    <KvGrid
      :cols="2"
      :items="[
        {
          label: t('Verification.state'),
          value: t(record.verified ? 'Verification.verified' : 'Verification.unverified')
        },
        ...(record.verified
          ? [
              { label: t('Verification.at'), value: formatFinanceTime(record.verifiedAt) || '—' },
              { label: t('Verification.operator'), value: record.verifiedName || '—' },
              { label: t('Verification.remark'), value: record.verificationRemark || '—' }
            ]
          : [])
      ]"
    />
  </SectionCard>
  <SectionCard
    icon="UserOutlined"
    :title="t('Document.buyerTitle')"
  >
    <KvGrid
      :cols="2"
      :items="buyerItems"
    />
  </SectionCard>
  <SectionCard
    icon="UnorderedListOutlined"
    :title="t('Document.lines')"
  >
    <a-table
      :row-key="sourceKey"
      :columns="columns"
      :data-source="lines"
      size="small"
      :scroll="{ x: 2400 }"
      :pagination="{ pageSize: 10 }"
    />
    <div class="document-totals">
      <span>{{ t('Document.netAmount') }} {{ summary.netAmount }}</span>
      <span>{{ t('Document.taxAmount') }} {{ summary.taxAmount }}</span>
    </div>
  </SectionCard>
  <template
    v-for="line in lines"
    :key="sourceKey(line)"
  >
    <SectionCard
      v-if="line.voucher"
      icon="PaperClipOutlined"
      :title="t('Document.voucherTitle')"
      :sub="line.fullName + ' · ' + line.subjectName"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Document.voucher.type'), value: t('Document.voucherTypes.' + line.voucher.type) },
          { label: t('Document.voucher.date'), value: line.voucher.date },
          { label: t('Document.voucher.amount'), value: line.voucher.amount },
          { label: t('Document.voucher.electronicInvoiceNumber'), value: line.voucher.electronicInvoiceNumber || '—' },
          { label: t('Document.voucher.invoiceCode'), value: line.voucher.invoiceCode || '—' },
          {
            label: t('Document.voucher.invoiceNumber'),
            value: line.voucher.invoiceNumber || line.voucher.number || '—'
          },
          { label: t('Setting.remark'), value: line.voucher.remark || '—' }
        ]"
      />
      <a
        :href="getImageUrl(line.voucher.attachmentFileId)"
        target="_blank"
        rel="noopener noreferrer"
      >
        <AIcon type="PaperClipOutlined" />
        {{ line.voucher.attachmentFileName }}
      </a>
    </SectionCard>
  </template>
  <SectionCard
    v-if="record?.remark"
    icon="FileTextOutlined"
    :title="t('Setting.remark')"
  >
    <p class="document-remark">{{ record.remark }}</p>
  </SectionCard>
</template>
