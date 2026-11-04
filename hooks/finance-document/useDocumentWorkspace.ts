import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getDocument,
  queryDocuments,
  type DocumentRecord,
  type DocumentDetail,
  type DocumentType,
  type DocumentInput,
  type DocumentPreview,
  type DocumentReverseInput,
  type DocumentReversePreview,
  type DocumentReopenInput,
  type DocumentReopenPreview
} from '../../api/financeDocument'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { useDocumentRecovery } from './useDocumentRecovery'

export function useDocumentWorkspace(type: DocumentType) {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const table = ref<{ reload: () => void }>(),
    terms = ref<Query['terms']>([]),
    status = ref('ALL')
  const issueOpen = ref(false),
    detailOpen = ref(false),
    reverseOpen = ref(false),
    reopenOpen = ref(false)
  const detail = ref<DocumentDetail>(),
    reverseTarget = ref<DocumentRecord>(),
    reopenTarget = ref<DocumentRecord>()
  const loading = ref(false),
    failed = ref(false),
    issuePending = ref(false),
    reversePending = ref(false),
    reopenPending = ref(false),
    recoveryFailed = ref(false)
  const issueRecovery = useDocumentRecovery<DocumentInput, DocumentPreview>(projectId, type, 'issue')
  const reverseRecovery = useDocumentRecovery<DocumentReverseInput, DocumentReversePreview>(projectId, type, 'reverse')
  const reopenRecovery = useDocumentRecovery<DocumentReopenInput, DocumentReopenPreview>(projectId, type, 'reopen')
  const permission = type === 'INVOICE' ? 'charging/FinanceInvoice' : 'charging/FinanceReceipt'
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  const params = computed(() => ({
    projectId: projectId.value,
    terms: [
      ...(terms.value || []),
      ...(status.value === 'ALL' ? [] : [{ column: 'status', value: status.value, termType: 'eq' }])
    ],
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const blocked = computed(
    () =>
      issueOpen.value ||
      reverseOpen.value ||
      reopenOpen.value ||
      issuePending.value ||
      reversePending.value ||
      reopenPending.value ||
      recoveryFailed.value
  )
  let generation = 0,
    disposed = false
  const request = (q: Query, config?: { signal: AbortSignal }) =>
    queryDocuments(projectId.value, type, q, config?.signal)
  function checkPending() {
    recoveryFailed.value = false
    try {
      issuePending.value = !!issueRecovery.read()
      reversePending.value = !!reverseRecovery.read()
      reopenPending.value = type === 'INVOICE' && !!reopenRecovery.read()
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function start() {
    if (projectId.value && !blocked.value) issueOpen.value = true
  }
  function closeIssue() {
    issueOpen.value = false
    checkPending()
  }
  function closeReverse() {
    reverseOpen.value = false
    reverseTarget.value = undefined
    checkPending()
  }
  function closeReopen() {
    reopenOpen.value = false
    reopenTarget.value = undefined
    checkPending()
  }
  function reopen(row: DocumentRecord) {
    if (blocked.value || type !== 'INVOICE') return
    reopenTarget.value = row
    reopenOpen.value = true
  }
  function recoverReopen() {
    try {
      reopenTarget.value = reopenRecovery.read()?.preview.original
      reopenOpen.value = !!reopenTarget.value
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function saved() {
    checkPending()
    table.value?.reload()
  }
  function reverse(row: DocumentRecord) {
    if (blocked.value) return
    reverseTarget.value = row
    reverseOpen.value = true
  }
  function recoverReverse() {
    try {
      reverseTarget.value = reverseRecovery.read()?.preview.document
      reverseOpen.value = !!reverseTarget.value
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  async function select(id: string) {
    const n = ++generation,
      project = projectId.value
    detailOpen.value = true
    detail.value = undefined
    loading.value = true
    failed.value = false
    try {
      const value = await getDocument(project, type, id)
      if (!disposed && n === generation) detail.value = value
    } catch (e) {
      if (!disposed && n === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && n === generation) loading.value = false
    }
  }
  function closeDetail() {
    ++generation
    detailOpen.value = false
    detail.value = undefined
  }
  watch(
    projectId,
    () => {
      closeDetail()
      issueOpen.value = false
      reverseOpen.value = false
      reopenOpen.value = false
      reopenTarget.value = undefined
      terms.value = []
      status.value = 'ALL'
      checkPending()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !blocked.value && !detailOpen.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    projectId,
    permission,
    table,
    terms,
    status,
    params,
    request,
    notify,
    issueOpen,
    detailOpen,
    reverseOpen,
    reverseTarget,
    detail,
    loading,
    failed,
    issuePending,
    reversePending,
    reopenOpen,
    reopenTarget,
    reopenPending,
    reopen,
    closeReopen,
    recoverReopen,
    recoveryFailed,
    blocked,
    start,
    closeIssue,
    closeReverse,
    saved,
    reverse,
    recoverReverse,
    select,
    closeDetail
  }
}
