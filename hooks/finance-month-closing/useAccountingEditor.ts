import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  createAccountingYear,
  editAccountingYear,
  type AccountingPeriod,
  type CalendarInput
} from '../../api/financeAccounting'
import { requestErrorMessage } from '../../utils/requestError'

export function useAccountingEditor(
  props: { projectId: string; year: number; mode: 'create' | 'edit'; periods: AccountingPeriod[] },
  saved: () => void
) {
  const { t } = useI18n(),
    saving = ref(false),
    reason = ref(''),
    mode = ref<CalendarInput['mode']>('NATURAL'),
    openingDay = ref(1)
  // 日期成对提交全年；版本来自打开编辑器时的快照，不用刷新后的版本掩盖并发冲突。
  const rows = ref(props.periods.map((row) => ({ ...row })))
  const validDates = computed(() => {
    if (rows.value.length !== 12) return false
    let expected = `${String(props.year).padStart(4, '0')}-01-01`
    for (let i = 0; i < 12; i++) {
      const row = rows.value[i]
      if (
        row.accountMonth !== `${String(props.year).padStart(4, '0')}-${String(i + 1).padStart(2, '0')}` ||
        !row.startDate ||
        !row.endDate ||
        dayjs(row.startDate).format('YYYY-MM-DD') !== row.startDate ||
        dayjs(row.endDate).format('YYYY-MM-DD') !== row.endDate ||
        row.startDate !== expected ||
        row.startDate > row.endDate
      )
        return false
      expected = dayjs(row.endDate).add(1, 'day').format('YYYY-MM-DD')
    }
    return rows.value[11].endDate === `${String(props.year).padStart(4, '0')}-12-31`
  })
  const valid = computed(() =>
    props.mode === 'create'
      ? mode.value === 'NATURAL' ||
        (Number.isInteger(openingDay.value) && openingDay.value >= 1 && openingDay.value <= 28)
      : validDates.value && !!reason.value.trim()
  )
  async function save() {
    if (!valid.value || saving.value) return
    saving.value = true
    try {
      if (props.mode === 'create')
        await createAccountingYear(props.projectId, {
          year: props.year,
          mode: mode.value,
          openingDay: mode.value === 'NATURAL' ? 1 : openingDay.value
        })
      else
        await editAccountingYear(props.projectId, props.year, {
          reason: reason.value.trim(),
          items: rows.value.map((row) => ({
            month: row.accountMonth,
            version: row.version,
            start: row.startDate,
            end: row.endDate
          }))
        })
      onlyMessage(
        t(props.mode === 'create' ? 'MonthClosing.yearCreated' : 'MonthClosing.yearEdited', { year: props.year }),
        'success'
      )
      saved()
    } catch (e) {
      onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
    } finally {
      saving.value = false
    }
  }
  return { rows, mode, openingDay, saving, reason, validDates, valid, save }
}
