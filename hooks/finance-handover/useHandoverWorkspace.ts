import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { usePermission } from '@jetlinks-web/hooks'
import {
  queryHandovers,
  getHandover,
  type HandoverCandidate,
  type HandoverSourceType,
  type HandoverRecord,
  type HandoverDetail,
  type HandoverInput,
  type HandoverPreview,
  type HandoverActionInput,
  type HandoverActionPreview
} from '../../api/financeHandover'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { useHandoverRecovery } from './useHandoverRecovery'

export function useHandoverWorkspace() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const { hasPerm: canCreate } = usePermission('charging/FinanceHandover:create')
  const tab = ref(canCreate.value ? 'sources' : 'records'),
    type = ref<HandoverSourceType>('PAYMENT'),
    status = ref('ALL')
  const selected = ref<HandoverCandidate[]>([]),
    targets = ref<HandoverCandidate[]>([])
  const terms = ref<Query['terms']>([]),
    table = ref<{ reload: () => void }>()
  const editorOpen = ref(false),
    detailOpen = ref(false),
    actionOpen = ref(false)
  const actionTarget = ref<HandoverRecord>(),
    actionName = ref<HandoverActionInput['action']>('APPROVE')
  const loading = ref(false),
    detail = ref<HandoverDetail>(),
    detailFailed = ref(false)
  const pendingCreate = ref(false),
    pendingAction = ref(false),
    recoveryFailed = ref(false)
  const recovery = useHandoverRecovery<HandoverInput, HandoverPreview>(projectId, 'create')
  const actionRecovery = useHandoverRecovery<HandoverActionInput, HandoverActionPreview>(projectId, 'action')
  const blocked = computed(
    () => editorOpen.value || actionOpen.value || pendingCreate.value || pendingAction.value || recoveryFailed.value
  )
  const params = computed(() => ({
    projectId: projectId.value,
    terms: [
      ...(terms.value || []),
      ...(status.value === 'ALL' ? [] : [{ column: 'status', value: status.value, termType: 'eq' }])
    ]
  }))
  const request = (q: Query, config?: { signal: AbortSignal }) => queryHandovers(projectId.value, q, config?.signal)
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  let generation = 0
  function check() {
    try {
      pendingCreate.value = !!recovery.read()
      pendingAction.value = !!actionRecovery.read()
      recoveryFailed.value = false
    } catch (e) {
      recoveryFailed.value = true
      notify(e)
    }
  }
  function start() {
    if (!canCreate.value || blocked.value || !projectId.value || !selected.value.length) return
    targets.value = [...selected.value]
    editorOpen.value = true
  }
  function recover() {
    try {
      const saved = recovery.read()
      if (saved) {
        targets.value = saved.request.input.items.map((i) => ({
          ...i,
          occurredAt: '',
          companyName: '',
          customerName: '',
          amount: '',
          cashAmount: '',
          lineCount: 0
        }))
        editorOpen.value = true
      } else {
        const action = actionRecovery.read()
        if (action) {
          actionTarget.value = action.preview.batch
          actionName.value = action.request.input.action
          actionOpen.value = true
        }
      }
    } catch (e) {
      recoveryFailed.value = true
      notify(e)
    }
  }
  function closeEditor() {
    editorOpen.value = false
    targets.value = []
    check()
  }
  function closeAction() {
    actionOpen.value = false
    actionTarget.value = undefined
    check()
  }
  function saved() {
    selected.value = []
    table.value?.reload()
    check()
  }
  function act(row: HandoverRecord, action: HandoverActionInput['action']) {
    if (blocked.value) return
    actionTarget.value = row
    actionName.value = action
    actionOpen.value = true
  }
  async function select(id: string) {
    const n = ++generation,
      project = projectId.value
    detailOpen.value = true
    loading.value = true
    detail.value = undefined
    detailFailed.value = false
    try {
      const value = await getHandover(project, id)
      if (n === generation && project === projectId.value) detail.value = value
    } catch (e) {
      if (n === generation) {
        detailFailed.value = true
        notify(e)
      }
    } finally {
      if (n === generation) loading.value = false
    }
  }
  function closeDetail() {
    ++generation
    detailOpen.value = false
    loading.value = false
    detail.value = undefined
  }
  function changed(_keys: (string | number)[], rows: HandoverCandidate[]) {
    if (rows.length > 100) return onlyMessage(t('Handover.limit'), 'warning')
    selected.value = rows
  }
  watch(
    projectId,
    () => {
      selected.value = []
      targets.value = []
      closeDetail()
      editorOpen.value = false
      actionOpen.value = false
      check()
    },
    { immediate: true }
  )
  watch([type, tab], () => {
    selected.value = []
    terms.value = []
  })
  useProjectSwitchGuard(() => !blocked.value)
  onScopeDispose(() => {
    ++generation
  })
  return {
    t,
    canCreate,
    projectId,
    tab,
    type,
    status,
    selected,
    targets,
    terms,
    table,
    params,
    request,
    editorOpen,
    detailOpen,
    actionOpen,
    actionTarget,
    actionName,
    loading,
    detail,
    detailFailed,
    blocked,
    pendingCreate,
    pendingAction,
    recoveryFailed,
    notify,
    start,
    recover,
    closeEditor,
    closeAction,
    closeDetail,
    saved,
    act,
    select,
    changed
  }
}
