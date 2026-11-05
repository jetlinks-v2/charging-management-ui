import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { useFinanceSpaceScope } from '../finance-setting/useFinanceSpaceScope'
import { flattenSpaces } from '../finance-setting/useFinanceSpaceScope'
import type { Query } from '../../api/archive'
import type { ReceivedInput } from '../../api/financeReceivedReport'
import { exportReceivedLedger, queryReceivedLedger } from '../../api/financeReceivedLedger'
import { requestErrorMessage } from '../../utils/requestError'
import { useReportExport } from '../finance-report/useReportExport'

/** 台账与导出共用服务器现金口径；预收/押金结转不重复计入已收款。 */
export function useReceivedLedger(archive: ReturnType<typeof useFinanceSpaceScope>) {
  const { t } = useI18n()
  const filters = ref<Partial<ReceivedInput>>({})
  const draft = ref<Partial<ReceivedInput>>({})
  const applyFilters = () => {
    filters.value = { ...draft.value }
  }
  const resetFilters = () => {
    draft.value = {}
    filters.value = {}
  }
  const input = computed<ReceivedInput>(() => ({
    projectIds: [archive.projectId.value],
    spaceIds: archive.selected.value ? flattenSpaces([archive.selected.value]).map((v) => v.id) : [],
    subjectIds: [],
    paymentMethods: [],
    sourceTypes: [],
    groupBy: 'DETAIL',
    pageIndex: 0,
    pageSize: 12,
    ...filters.value
  }))
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  async function request(q: Query, config?: { signal: AbortSignal }) {
    const result = await queryReceivedLedger(
      archive.projectId.value,
      {
        ...input.value,
        pageIndex: q.pageIndex || 0,
        pageSize: q.pageSize || 12
      },
      config?.signal
    )
    return { success: true, result: result.page }
  }
  const { exporting, exportRows } = useReportExport({
    projectId: archive.projectId,
    enabled: () => !!archive.projectId.value,
    input: () => ({ ...input.value }),
    title: () => t('Cashier.receivedLedger'),
    fallback: () => t('Finance.failed'),
    request: (payload) => exportReceivedLedger(archive.projectId.value, payload)
  })
  return { input, draft, applyFilters, resetFilters, exporting, request, exportRows, notify }
}
