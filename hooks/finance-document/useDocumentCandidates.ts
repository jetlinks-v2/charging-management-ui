import { computed, ref, type Ref } from 'vue'
import {
  queryDocumentCandidates,
  type DocumentCandidate,
  type DocumentSourceType,
  type DocumentType
} from '../../api/financeDocument'
import type { Query } from '../../api/archive'

export function useDocumentCandidates(
  props: { projectId: string; type: DocumentType },
  selected: Ref<DocumentCandidate[]>
) {
  const sourceType = ref<DocumentSourceType>('RECEIVABLE'),
    keywords = ref('')
  const params = computed(() => ({
    sourceType: sourceType.value,
    keywords: keywords.value,
    companyId: selected.value[0]?.companyId,
    customerId: selected.value[0]?.customerId
  }))
  // 固定来源查询契约只传分页和筛选，不能把表格通用terms传作不受控SQL条件。
  const request = (q: Query, config?: { signal: AbortSignal }) =>
    queryDocumentCandidates(
      props.projectId,
      props.type,
      { ...params.value, pageIndex: q.pageIndex, pageSize: q.pageSize },
      config?.signal
    )
  return { sourceType, keywords, params, request }
}
