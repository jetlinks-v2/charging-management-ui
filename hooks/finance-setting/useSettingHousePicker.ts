import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { querySettingHouses, type HouseInfo } from '../../api/financeSetting'
import { requestErrorMessage } from '../../utils/requestError'
export function useSettingHousePicker(props: {
  projectId: string
  selectedIds?: string[]
  limit?: number
  request?: typeof querySettingHouses
}) {
  const { t } = useI18n()
  const keyword = ref(''),
    pageIndex = ref(0),
    total = ref(0),
    rows = ref<HouseInfo[]>([]),
    loading = ref(false)
  const selected = ref<string[]>([])
  const remaining = computed(() => Math.max(0, (props.limit ?? 200) - (props.selectedIds?.length || 0)))
  let token = 0
  async function load(page = 0) {
    const generation = ++token
    loading.value = true
    pageIndex.value = page
    try {
      const result = await (props.request || querySettingHouses)(props.projectId, {
        keyword: keyword.value,
        pageIndex: page,
        pageSize: 8
      })
      if (generation === token) {
        rows.value = result.data
        total.value = result.total
      }
    } catch (error) {
      if (generation === token) {
        rows.value = []
        total.value = 0
        onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
      }
    } finally {
      if (generation === token) loading.value = false
    }
  }
  function select(keys: (string | number)[]) {
    const ids = keys.map(String).filter((id) => !props.selectedIds?.includes(id))
    if (ids.length > remaining.value) {
      onlyMessage(t('Setting.batchLimit'), 'warning')
      return
    }
    selected.value = ids
  }
  watch(
    () => props.projectId,
    () => {
      ++token
      selected.value = []
      void load()
    },
    { immediate: true }
  )
  onScopeDispose(() => {
    ++token
  })
  return { keyword, pageIndex, total, rows, loading, selected, remaining, load, select }
}
