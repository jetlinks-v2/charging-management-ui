import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentCandidate, DocumentItem } from '../../api/financeDocument'
import { useDocumentItem } from './useDocumentItem'
import { estimateDocumentTax } from '../../utils/documentTax'
import { formatDocumentRate } from '../../utils/documentPresentation'
import { validDocumentDeduction } from '../../utils/documentSelection'

export function useDocumentInvoiceLines(props: { items: DocumentItem[]; sources: DocumentCandidate[] }) {
  const { t } = useI18n()
  const activeItem = ref<DocumentItem>()
  // 填写步骤的来源集合固定；返回来源步骤后会重新挂载，逐条独立清除全额模式的差额及凭证。
  props.items.forEach((item) => useDocumentItem({ item }))
  const rows = computed(() => props.items.map((item, index) => ({ item, source: props.sources[index] })))
  const columns = computed(() => [
    { title: t('Setting.house'), key: 'house', width: 210, fixed: 'left' as const },
    { title: t('Setting.customer'), key: 'customer', width: 100 },
    { title: t('Setting.subject'), key: 'subject', width: 130 },
    { title: t('Document.standard'), key: 'standard', width: 130 },
    { title: t('Document.collectionMethod'), key: 'method', width: 130 },
    { title: t('Document.sourceAmount'), key: 'sourceAmount', width: 130 },
    { title: t('Document.differenceAmount'), key: 'difference', width: 150 },
    { title: t('Document.voucherTitle'), key: 'voucher', width: 120 },
    { title: t('Document.taxRate'), key: 'rate', width: 90 },
    { title: t('Document.issueAmount'), key: 'amount', width: 150, fixed: 'right' as const },
    { title: t('Document.outputTax'), key: 'tax', width: 150, fixed: 'right' as const }
  ])
  return { t, activeItem, rows, columns, estimateDocumentTax, formatDocumentRate, validDocumentDeduction }
}
