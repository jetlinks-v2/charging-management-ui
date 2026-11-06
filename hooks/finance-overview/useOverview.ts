import { computed, onScopeDispose, ref, watch } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryOverview, type OverviewResult } from '../../api/financeOverview'
import { requestErrorMessage } from '../../utils/requestError'
import { useOverviewProjects } from './useOverviewProjects'

export function useOverview() {
  const projects = useOverviewProjects(),
    { t } = useI18n()
  const period = ref<'month' | 'year' | 'custom'>('month')
  const dates = ref<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()])
  const data = ref<OverviewResult>(),
    loading = ref(false),
    failed = ref(false)
  let generation = 0,
    controller: AbortController | undefined
  const active = computed(() => ({
    projectIds: [...projects.ids.value],
    startDate: dates.value[0].format('YYYY-MM-DD'),
    endDate: dates.value[1].format('YYYY-MM-DD')
  }))
  async function load() {
    const token = ++generation
    controller?.abort()
    data.value = undefined
    failed.value = false
    loading.value = false
    if (!active.value.projectIds.length) return
    controller = new AbortController()
    loading.value = true
    try {
      const result = await queryOverview(active.value, controller.signal)
      // 项目或日期变化后旧响应不能覆盖新范围，也不能留下旧项目金额。
      if (token === generation) data.value = result
    } catch (cause) {
      if (token !== generation) return
      failed.value = true
      onlyMessage(requestErrorMessage(cause, t('Overview.failed')), 'error')
    } finally {
      if (token === generation) loading.value = false
    }
  }
  function selectPeriod(value: 'month' | 'year' | 'custom') {
    period.value = value
    if (value !== 'custom') dates.value = [dayjs().startOf(value), dayjs()]
  }
  function selectDates(input: [Dayjs, Dayjs] | [string, string] | null) {
    const value = input ? ([dayjs(input[0]), dayjs(input[1])] as [Dayjs, Dayjs]) : null
    if (!value) return
    if (value[1].diff(value[0], 'day') > 365) {
      onlyMessage(t('Overview.dateLimit'), 'warning')
      return
    }
    dates.value = value
  }
  watch(active, load, { immediate: true })
  onScopeDispose(() => {
    generation++
    controller?.abort()
  })
  return { projects, period, dates, data, loading, failed, load, selectPeriod, selectDates }
}
