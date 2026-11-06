import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { useClosingRecovery } from './useClosingRecovery'
import { getAccountingYear, type AccountingPeriod, type ClosingAction } from '../../api/financeAccounting'
import { requestErrorMessage } from '../../utils/requestError'

/** 项目/年度请求代次隔离；未确认操作恢复前不允许其他页签切换项目。 */
export function useMonthClosingWorkspace() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const year = ref(new Date().getFullYear()),
    periods = ref<AccountingPeriod[]>([]),
    selectedMonth = ref('')
  const loading = ref(false),
    failed = ref(false),
    editor = ref<'create' | 'edit'>(),
    ruleOpen = ref(false)
  const action = ref<ClosingAction>('CLOSE'),
    batchAction = ref<ClosingAction>(),
    batchSelected = ref<AccountingPeriod[]>([]),
    detailOpen = ref(false),
    target = ref<AccountingPeriod>(),
    pending = ref(false),
    recoveryFailed = ref(false)
  const recovery = useClosingRecovery(projectId)
  const blocked = computed(
    () =>
      !!target.value || !!batchAction.value || !!editor.value || ruleOpen.value || pending.value || recoveryFailed.value
  )
  const selected = computed(() => periods.value.find((row) => row.accountMonth === selectedMonth.value))
  let generation = 0,
    abort: AbortController | undefined
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  function check() {
    try {
      pending.value = !!recovery.read()
      recoveryFailed.value = false
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  async function reload() {
    const n = ++generation,
      project = projectId.value,
      currentYear = year.value
    abort?.abort()
    abort = new AbortController()
    loading.value = !!project
    failed.value = false
    periods.value = []
    if (!project) return
    try {
      const rows = await getAccountingYear(project, currentYear, abort.signal)
      if (n !== generation) return
      periods.value = rows
      if (!rows.some((row) => row.accountMonth === selectedMonth.value))
        selectedMonth.value =
          rows.find((row) => row.status === 'OPEN')?.accountMonth || rows[rows.length - 1]?.accountMonth || ''
    } catch (e) {
      if (n === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (n === generation) loading.value = false
    }
  }
  function start(row: AccountingPeriod, value: ClosingAction) {
    if (blocked.value) return
    detailOpen.value = false
    target.value = row
    action.value = value
  }
  function recover() {
    try {
      const value = recovery.read()
      if (!value) return
      const input = value.request.input
      // 恢复不依赖当前目录版本；若年度不同，只构造确认所需的只读月份标识。
      target.value = periods.value.find((row) => row.accountMonth === input.month) || {
        id: '',
        projectId: projectId.value,
        accountYear: Number(input.month.slice(0, 4)),
        accountMonth: input.month,
        version: input.version,
        startDate: '',
        endDate: '',
        status: input.action === 'CLOSE' ? 'OPEN' : 'CLOSED',
        mode: 'NATURAL',
        openingDay: 1
      }
      action.value = input.action
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function closeAction() {
    target.value = undefined
    check()
  }
  function saved() {
    check()
    void reload()
  }
  useProjectSwitchGuard(() => !blocked.value)
  watch(
    [projectId, year],
    () => {
      detailOpen.value = false
      batchSelected.value = []
      check()
      void reload()
    },
    { immediate: true }
  )
  onScopeDispose(() => {
    ++generation
    abort?.abort()
  })
  return {
    projectId,
    year,
    periods,
    selectedMonth,
    selected,
    detailOpen,
    batchAction,
    batchSelected,
    loading,
    failed,
    editor,
    ruleOpen,
    target,
    action,
    blocked,
    pending,
    recoveryFailed,
    reload,
    start,
    recover,
    closeAction,
    saved
  }
}
