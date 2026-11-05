import type { Query } from '../../api/archive'
import { queryDocumentLogs, type DocumentRecord } from '../../api/financeDocument'
export function useDocumentLogs(props: { projectId: string; document: DocumentRecord }) {
  const request = (q: Query, config?: { signal: AbortSignal }) =>
    queryDocumentLogs(props.projectId, props.document.documentType, props.document.id, q, config?.signal)
  return { request }
}
