import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Grid } from 'ant-design-vue'
import type { DocumentType } from '../../api/financeDocument'

export function useDocumentColumns(type: DocumentType, extra: Ref<boolean>) {
  const { t } = useI18n()
  const screens = Grid.useBreakpoint()
  const fields = computed(() => [
    ...['documentNumber', 'buyerName', 'customerName', 'companyName', 'fullName', 'subjectName'].map((key) => ({
      title: t(['fullName', 'subjectName'].includes(key) ? 'Document.' + key : 'Document.fields.' + key),
      dataIndex: key,
      ...(['fullName', 'subjectName'].includes(key) ? { termOptions: ['eq', 'like'] } : {}),
      search: { type: 'string' as const }
    })),
    { title: t('Document.issuedAt'), dataIndex: 'issuedAt', search: { type: 'date' as const } },
    {
      title: t('Document.paymentStatus'),
      dataIndex: 'paymentStatus',
      termOptions: [{ value: 'eq', label: t('Document.filterEquals') }],
      search: {
        type: 'select' as const,
        options: ['UNPAID', 'PARTIAL', 'PAID', 'UNKNOWN'].map((value) => ({
          value,
          label: t('Document.paymentStates.' + value)
        }))
      }
    },
    {
      title: t('Document.source'),
      dataIndex: 'sourceType',
      termOptions: ['eq'],
      search: {
        type: 'select' as const,
        options: ['RECEIVABLE', 'TEMP_PAYMENT', 'FUND_TOPUP'].map((value) => ({
          value,
          label: t('Document.sourceTypes.' + value)
        }))
      }
    },
    {
      title: t('Document.sceneTitle'),
      dataIndex: 'issueScene',
      search: {
        type: 'select' as const,
        options: ['BEFORE_PAYMENT', 'AFTER_PAYMENT', 'MIXED'].map((value) => ({
          value,
          label: t('Document.scene.' + value)
        }))
      }
    }
  ])
  const columns = computed(() => [
    { title: t('Document.number'), dataIndex: 'number', width: 230, scopedSlots: true },
    { title: t('Document.state'), dataIndex: 'status', width: 140, scopedSlots: true },
    ...(type === 'RECEIPT'
      ? [{ title: t('Verification.state'), dataIndex: 'verified', width: 110, scopedSlots: true }]
      : []),
    { title: t('Document.business'), dataIndex: 'business', width: 290, scopedSlots: true },
    { title: t('Document.sourceScene'), dataIndex: 'sourceScene', width: 150, scopedSlots: true },
    { title: t('Document.paymentStatus'), dataIndex: 'collection', width: 150, scopedSlots: true },
    { title: t('Document.buyer.name'), dataIndex: 'buyerName', width: 170 },
    ...(extra.value
      ? [
          { title: t('Document.seller'), dataIndex: 'companyName', width: 190 },
          { title: t('Document.issuePaidAmount'), dataIndex: 'issuePaidAmount', width: 150, align: 'right' },
          { title: t('Document.issuerName'), dataIndex: 'issuerName', width: 130 },
          { title: t('Document.taxSnapshot'), dataIndex: 'taxSnapshot', width: 240, scopedSlots: true },
          ...(type === 'INVOICE'
            ? [{ title: t('Document.ruleSnapshot'), dataIndex: 'ruleSnapshot', width: 200, scopedSlots: true }]
            : [])
        ]
      : []),
    { title: t('Document.total'), dataIndex: 'amount', width: 140, align: 'right', scopedSlots: true },
    { title: t('Document.issuedAt'), dataIndex: 'issuedAt', width: 180, scopedSlots: true },
    {
      title: t('Finance.actions'),
      dataIndex: 'actions',
      width: 260,
      fixed: screens.value.md ? 'right' : undefined,
      scopedSlots: true
    }
  ])
  return { fields, columns }
}
