import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import {
  getRefundApplication,
  queryRefundApplications,
  editRefundApplication,
  getRefundOperations,
  type RefundOperation,
  type RefundEditInput,
  type RefundApplicationDetail,
  type RefundApplicationView
} from '../../api/financeRefundApplication'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useRefundReview } from './useRefundReview'

export function useRefundApplications() {
  const { t } = useI18n()
  const { projectId } = useProjectContext()
  const table = ref<{ reload: () => void }>()
  const status = ref('PENDING'),
    terms = ref<Query['terms']>([])
  const detail = ref<RefundApplicationDetail>(),
    loading = ref(false),
    failed = ref(false),
    open = ref(false)
  const review = useRefundReview(projectId, () => table.value?.reload())
  const { target, action, reason, saving, uncertain, start, submit, cancel, selected } = review
  const operations = ref<RefundOperation[]>([]),
    editing = ref<RefundApplicationDetail>()
  const editLoading = ref(false),
    editSaving = ref(false)
  const editModel = reactive<RefundEditInput>({ version: 0, amount: '', receiverName: '', refundedAt: '', reason: '' })
  let generation = 0,
    disposed = false
  const params = computed(() => ({
    projectId: projectId.value,
    terms: [
      ...terms.value,
      ...(status.value === 'ALL' ? [] : [{ column: 'status', termType: 'eq', value: status.value }])
    ]
  }))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const request = (input: Query, config?: { signal: AbortSignal }) =>
    queryRefundApplications(projectId.value, input, config?.signal)
  async function select(id: string) {
    const token = ++generation
    open.value = true
    loading.value = true
    failed.value = false
    detail.value = undefined
    operations.value = []
    try {
      const [result, logs] = await Promise.all([
        getRefundApplication(projectId.value, id),
        getRefundOperations(projectId.value, id)
      ])
      if (!disposed && token === generation) {
        detail.value = result
        operations.value = logs
      }
    } catch (e) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  async function startEdit(id: string) {
    if (editLoading.value || editSaving.value) return
    const token = ++generation
    editLoading.value = true
    try {
      const result = await getRefundApplication(projectId.value, id)
      if (disposed || token !== generation) return
      if (result.application.status !== 'PENDING') {
        notify(new Error(t('Refund.editConflict')))
        return
      }
      editing.value = result
      Object.assign(editModel, {
        version: result.application.version,
        amount: result.application.amount,
        receiverName: result.application.receiverName,
        refundedAt: result.application.refundedAt,
        reason: result.application.reason
      })
    } catch (e) {
      if (!disposed && token === generation) notify(e)
    } finally {
      if (!disposed && token === generation) editLoading.value = false
    }
  }
  async function saveEdit() {
    if (!editing.value || editSaving.value) return
    if (
      !/^\d+(\.\d{1,2})?$/.test(editModel.amount) ||
      !editModel.receiverName.trim() ||
      !editModel.reason.trim() ||
      !editModel.refundedAt
    ) {
      onlyMessage(t('Refund.editRequired'), 'warning')
      return
    }
    editSaving.value = true
    try {
      await editRefundApplication(projectId.value, editing.value.application.id, { ...editModel })
      editing.value = undefined
      table.value?.reload()
      onlyMessage(t('Finance.saved'), 'success')
    } catch (e) {
      notify(e)
    } finally {
      editSaving.value = false
    }
  }
  function closeEdit() {
    if (!editSaving.value) editing.value = undefined
  }
  useProjectSwitchGuard(
    () => !target.value && !review.recoveryFailed.value && !open.value && !editing.value && !editLoading.value
  )
  watch(projectId, () => {
    ++generation
    open.value = false
    detail.value = undefined
    target.value = undefined
    editing.value = undefined
    editLoading.value = false
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    t,
    projectId,
    table,
    status,
    terms,
    params,
    detail,
    loading,
    failed,
    open,
    target,
    action,
    reason,
    saving,
    uncertain,
    request,
    select,
    start,
    submit,
    cancel,
    notify,
    review,
    selected,
    operations,
    editing,
    editLoading,
    editSaving,
    editModel,
    startEdit,
    saveEdit,
    closeEdit
  }
}
