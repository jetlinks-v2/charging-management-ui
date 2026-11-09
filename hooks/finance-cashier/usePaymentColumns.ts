import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { handoverStates } from '../../utils/collectionDisplay'

/** 实收与临时收款共用列定义，交账状态仅在实收的原收款页签筛选。 */
export function usePaymentColumns(temporary = false) {
  const { t } = useI18n()
  const fields = computed(() => [
    ...['fullName', 'customerName', 'subjectName', 'methodText'].map((key) => ({
      title: t(key === 'methodText' ? 'Cashier.method' : 'Receivable.' + key),
      dataIndex: key,
      search: { type: 'string' as const }
    })),
    ...(!temporary
      ? [
          {
            title: t('Received.handoverState'),
            dataIndex: 'handoverState',
            search: {
              type: 'select',
              termOptions: ['eq'],
              defaultTermType: 'eq',
              options: handoverStates.map((value) => ({ value, label: t('Received.handover.' + value) }))
            }
          }
        ]
      : [])
  ])
  const columns = computed(() => [
    { title: t('Document.billNo'), dataIndex: 'billNo', width: 280 },
    { title: t('Setting.house'), dataIndex: 'house', scopedSlots: true, width: 230 },
    { title: t('Receivable.subjectName'), dataIndex: 'subject', scopedSlots: true, width: 160 },
    { title: t('Cashier.payer'), dataIndex: 'payerName', width: 130 },
    { title: t('Cashier.method'), dataIndex: 'method', scopedSlots: true, width: 160 },
    { title: t('Cashier.amount'), dataIndex: 'amount', scopedSlots: true, width: 130, align: 'right' },
    { title: t('Refund.available'), dataIndex: 'available', scopedSlots: true, width: 130, align: 'right' },
    ...(!temporary
      ? [{ title: t('Received.handoverState'), dataIndex: 'handoverState', scopedSlots: true, width: 150 }]
      : []),
    { title: t('Cashier.paidAt'), dataIndex: 'paidAt', scopedSlots: true, width: 190 },
    { title: t('Cashier.company'), dataIndex: 'companyName', width: 200 },
    { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 150, fixed: 'right' }
  ])
  return { fields, columns }
}
