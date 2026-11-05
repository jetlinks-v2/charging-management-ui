import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { exportDocuments, type DocumentType } from '../../api/financeDocument'
import type { Query } from '../../api/archive'
import { useReportExport } from '../finance-report/useReportExport'

/** 与台账共享已应用条件，项目切换和迟到文件处理复用财务文件生命周期。 */
export function useDocumentFiles(projectId: Ref<string>, type: DocumentType, query: () => Query) {
  const { t } = useI18n()
  return useReportExport({
    projectId,
    enabled: () => !!projectId.value,
    input: () => ({ project: projectId.value, query: JSON.parse(JSON.stringify(query())) as Query }),
    title: () => t(type === 'INVOICE' ? 'Document.invoiceLedger' : 'Document.receiptLedger'),
    fallback: () => t('Finance.failed'),
    request: (input) => exportDocuments(input.project, type, input.query)
  })
}
