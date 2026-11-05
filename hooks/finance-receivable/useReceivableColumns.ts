import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  normalizeReceivableColumns,
  type ReceivableColumnPreference,
  type ReceivableColumnOption
} from '../../utils/receivableColumns'

export function useReceivableColumns() {
  const { t } = useI18n()
  const user = useUserStore()
  const options = computed<ReceivableColumnOption[]>(() => [
    { key: 'fullName', title: t('Setting.house'), width: 210, locked: true },
    { key: 'state', title: t('Setting.state'), width: 110 },
    { key: 'subjectName', title: t('Setting.subject'), width: 150 },
    { key: 'coverage', title: t('Receivable.coverage'), width: 140 },
    ...['actualReceivableAmount', 'paidAmount', 'arrears'].map((key) => ({
      key,
      title: t('Receivable.' + key),
      width: 130
    })),
    ...['contractCode', 'customerName', 'standardName', 'dueDate'].map((key) => ({
      key,
      title: t('Receivable.' + key),
      width: 160,
      hidden: true
    })),
    { key: 'actions', title: t('Finance.actions'), width: 160, locked: true }
  ])
  const preferences = ref<Record<string, ReceivableColumnPreference>>({})
  const storageKey = computed(() => `charging:receivable-columns:${user.userInfo.id || 'anonymous'}`)
  watch(
    storageKey,
    () => {
      try {
        const saved = window.localStorage.getItem(storageKey.value)
        preferences.value = normalizeReceivableColumns(options.value, saved ? JSON.parse(saved) : undefined)
      } catch {
        preferences.value = normalizeReceivableColumns(options.value, undefined)
        onlyMessage(t('Receivable.columnsUnavailable'), 'warning')
      }
    },
    { immediate: true }
  )
  function update(key?: string, value?: Partial<ReceivableColumnPreference>) {
    preferences.value = normalizeReceivableColumns(
      options.value,
      key ? { ...preferences.value, [key]: { ...preferences.value[key], ...value } } : undefined
    )
    try {
      window.localStorage.setItem(storageKey.value, JSON.stringify(preferences.value))
    } catch {
      onlyMessage(t('Receivable.columnsUnavailable'), 'warning')
    }
  }
  const columns = computed(() =>
    options.value
      .filter((option) => !preferences.value[option.key]?.hidden)
      .map((option) => ({
        title: option.title,
        dataIndex: option.key,
        width: preferences.value[option.key]?.width || option.width,
        scopedSlots: [
          'fullName',
          'state',
          'subjectName',
          'coverage',
          'actualReceivableAmount',
          'paidAmount',
          'arrears',
          'actions'
        ].includes(option.key),
        align: ['actualReceivableAmount', 'paidAmount', 'arrears'].includes(option.key) ? 'right' : undefined,
        fixed: option.key === 'actions' ? 'right' : undefined
      }))
  )
  const scrollWidth = computed(() => columns.value.reduce((sum, column) => sum + column.width, 48))
  return { options, preferences, columns, scrollWidth, update }
}
