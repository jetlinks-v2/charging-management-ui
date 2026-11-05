import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getClosingSchedule, saveClosingSchedule, type ClosingSchedule } from '../../api/financeAccounting'
import { requestErrorMessage } from '../../utils/requestError'

/** 配置CAS独立于账期版本；失败保留本次输入，不用重新加载的版本偷偷覆盖并发编辑。 */
export function useAutomaticClosing(project: string, busy: (value: boolean) => void) {
  const { t } = useI18n()
  const loading = ref(false),
    saving = ref(false),
    schedule = ref<ClosingSchedule>()
  const enabled = ref(false),
    mode = ref<ClosingSchedule['mode']>('MONTH_END'),
    day = ref(1),
    reason = ref('')
  let disposed = false
  const valid = computed(
    () =>
      !!schedule.value &&
      !!reason.value.trim() &&
      (mode.value === 'MONTH_END' || (Number.isInteger(day.value) && day.value >= 1 && day.value <= 28))
  )
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  async function load() {
    if (saving.value || loading.value) return
    loading.value = true
    schedule.value = undefined
    try {
      const result = await getClosingSchedule(project)
      if (disposed) return
      schedule.value = result
      enabled.value = result.enabled
      mode.value = result.mode
      day.value = result.day || 1
      reason.value = ''
    } catch (e) {
      if (!disposed) notify(e)
    } finally {
      loading.value = false
    }
  }
  async function save() {
    if (!valid.value || saving.value || !schedule.value) return
    saving.value = true
    busy(true)
    try {
      const result = await saveClosingSchedule(project, {
        version: schedule.value.version,
        enabled: enabled.value,
        mode: mode.value,
        day: mode.value === 'DAY' ? day.value : null,
        reason: reason.value.trim()
      })
      if (disposed) return
      schedule.value = result
      reason.value = ''
      onlyMessage(t('MonthClosing.auto.saved'), 'success')
    } catch (e) {
      if (!disposed) notify(e)
    } finally {
      saving.value = false
      busy(false)
    }
  }
  onMounted(load)
  onScopeDispose(() => {
    disposed = true
  })
  return { loading, saving, schedule, enabled, mode, day, reason, valid, load, save }
}
