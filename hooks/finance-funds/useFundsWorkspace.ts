import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { queryFunds, getFund, type FundAccount, type FundType } from '../../api/financeFunds'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useFundFlow } from './useFundFlow'
import { useFundReturnFlow } from './useFundReturnFlow'
import { useFundRevokeFlow } from './useFundRevokeFlow'
import { flattenSpaces, useFinanceSpaceScope } from '../finance-setting/useFinanceSpaceScope'

export function useFundsWorkspace(fixedType?: FundType) {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const flow = useFundFlow(projectId)
  const returns = useFundReturnFlow(projectId)
  const revocations = useFundRevokeFlow(projectId)
  const archive = useFinanceSpaceScope()
  const type = ref<FundType | ''>(fixedType || ''),
    terms = ref<Query['terms']>([])
  const table = ref<{ reload: () => void }>()
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    detail = ref<FundAccount>()
  let generation = 0,
    disposed = false
  const params = computed(() => ({
    projectId: projectId.value,
    type: type.value,
    terms: [
      { terms: terms.value },
      ...(type.value ? [{ column: 'type', termType: 'eq', value: type.value }] : []),
      ...(archive.selected.value
        ? [{ column: 'spaceId', termType: 'in', value: flattenSpaces([archive.selected.value]).map((v) => v.id) }]
        : [])
    ],
    sorts: [{ name: 'modifyTime', order: 'desc' }]
  }))
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  const request = (q: Query, config?: { signal: AbortSignal }) =>
    projectId.value
      ? queryFunds(projectId.value, q, config?.signal)
      : Promise.resolve({ success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } })
  function close() {
    ++generation
    open.value = false
    detail.value = undefined
  }
  async function select(id: string) {
    const token = ++generation,
      project = projectId.value
    if (!project) return
    open.value = true
    loading.value = true
    failed.value = false
    detail.value = undefined
    try {
      const row = await getFund(project, id)
      if (!disposed && token === generation) detail.value = row
    } catch (e) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  function saved() {
    flow.saved()
    returns.saved()
    revocations.saved()
    table.value?.reload()
    close()
  }
  useProjectSwitchGuard(() => !open.value)
  watch(projectId, () => {
    close()
    terms.value = []
    type.value = fixedType || ''
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    archive,
    projectId,
    flow,
    returns,
    revocations,
    table,
    type,
    terms,
    params,
    request,
    open,
    loading,
    failed,
    detail,
    select,
    close,
    saved,
    notify
  }
}
