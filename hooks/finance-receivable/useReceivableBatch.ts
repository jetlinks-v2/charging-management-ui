import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  deleteReceivableBatch,
  previewPaymentNotice,
  type Receivable,
  type PaymentNotice
} from '../../api/financeReceivable'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

/** 查询范围改变清除勾选；前端不合成通知金额，确认删除沿后端批量事务。 */
export function useReceivableBatch(project: Ref<string>, params: Ref<unknown>, saved: () => void) {
  const { t } = useI18n()
  const selected = ref<Receivable[]>([]),
    deleting = ref(false),
    busy = ref(false)
  const reason = ref(''),
    notice = ref<PaymentNotice>()
  let generation = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function clear() {
    ++generation
    selected.value = []
    deleting.value = false
    notice.value = undefined
    reason.value = ''
  }
  watch(params, clear, { deep: true })
  function startDelete() {
    if (!selected.value.length || busy.value) return
    if (selected.value.some((row) => !row.allowedOperations.includes('DELETE'))) {
      onlyMessage(t('Receivable.batchBlocked'), 'warning')
      return
    }
    reason.value = ''
    deleting.value = true
  }
  async function remove() {
    if (!deleting.value || !reason.value.trim() || !selected.value.length || busy.value) return
    busy.value = true
    const token = generation,
      items = selected.value.map(({ id, version }) => ({ id, version }))
    try {
      await deleteReceivableBatch(project.value, items, reason.value.trim())
      if (!disposed && token === generation) {
        clear()
        onlyMessage(t('Receivable.changed'), 'success')
        saved()
      }
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed) busy.value = false
    }
  }
  async function preview() {
    if (!selected.value.length || busy.value) return
    busy.value = true
    const token = generation
    try {
      const result = await previewPaymentNotice(
        project.value,
        selected.value.map(({ id, version }) => ({ id, version }))
      )
      if (!disposed && token === generation) notice.value = result
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed) busy.value = false
    }
  }
  useProjectSwitchGuard(() => !busy.value && !deleting.value && !notice.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { selected, deleting, busy, reason, notice, clear, startDelete, remove, preview }
}
