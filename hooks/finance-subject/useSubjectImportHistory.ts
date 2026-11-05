import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { querySubjectImports, type SubjectImportRecord } from '../../api/financeSubject'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
export function useSubjectImportHistory(props: { open: boolean }) {
  const { t } = useI18n()
  const table = ref<{ reload: () => void }>()
  const params = computed(() => ({ open: props.open }))
  function request(query: Query, options?: { signal: AbortSignal }) {
    if (!props.open) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    return querySubjectImports({ terms: [], pageIndex: query.pageIndex, pageSize: query.pageSize }, options?.signal)
  }
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  const failure = (row: SubjectImportRecord) => onlyMessage(row.errorMessage || t('Subject.importFailed'), 'error')
  watch(
    () => props.open,
    (value) => {
      if (value) table.value?.reload()
    }
  )
  return { table, params, request, notify, failure }
}
