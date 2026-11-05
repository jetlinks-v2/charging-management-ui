import { computed, ref, watch } from 'vue'
import { receivableColumnOptions } from '../../utils/receivableColumnDefinitions'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { onlyMessage } from '@jetlinks-web/utils'
import { normalizeReceivableColumns, type ReceivableColumnPreference } from '../../utils/receivableColumns'

export function useReceivableColumns() {
  const { t } = useI18n()
  const user = useUserStore()
  const options = computed(() => receivableColumnOptions(t))
  const keyword = ref('')
  const groups = computed(() =>
    ['identity', 'amount', 'payment', 'billing', 'record']
      .map((key) => ({
        key,
        title: t('ReceivableLedger.groups.' + key),
        options: options.value.filter(
          (option) => option.group === key && (!keyword.value.trim() || option.title.includes(keyword.value.trim()))
        )
      }))
      .filter((group) => group.options.length)
  )
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
        scopedSlots: true,
        align:
          option.kind === 'money' || option.kind === 'price' || option.key === 'usageValue'
            ? ('right' as const)
            : undefined,
        fixed:
          option.key === 'actions'
            ? ('right' as const)
            : ['contractCode', 'rowNumber'].includes(option.key)
              ? ('left' as const)
              : undefined
      }))
  )
  const scrollWidth = computed(() => columns.value.reduce((sum, column) => sum + column.width, 48))
  return { options, preferences, columns, scrollWidth, update, keyword, groups }
}
