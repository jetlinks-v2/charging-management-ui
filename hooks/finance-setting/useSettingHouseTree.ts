import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { querySettingHouses, type HouseInfo } from '../../api/financeSetting'
import type { FinanceSpace } from '../../api/financeSpace'
import { filterHouseNodes, flattenHouseNodes, settingHouseNodes } from '../../utils/settingHouseTree'
import { requestErrorMessage } from '../../utils/requestError'
import { spaceCheckState } from '../../utils/spaceCheckState'

export function useSettingHouseTree(props: {
  projectId: string
  spaces: FinanceSpace[]
  busy: boolean
  selectedIds: string[]
  limit: number
}) {
  const { t } = useI18n()
  const keyword = ref(''),
    loading = ref(false),
    failed = ref(false),
    selected = ref<string[]>([])
  const houses = ref(new Map<string, HouseInfo>())
  const tree = computed(() => settingHouseNodes(props.spaces, houses.value, new Set(props.selectedIds)))
  const visibleTree = computed(() => filterHouseNodes(tree.value, keyword.value))
  const visibleHouses = computed(() =>
    flattenHouseNodes(visibleTree.value).filter((node) => node.available && !node.added)
  )
  const checkedKeys = computed(() => spaceCheckState(visibleTree.value, selected.value,
    new Set(visibleHouses.value.map((node) => node.key))))
  const remaining = computed(() => Math.max(0, props.limit - props.selectedIds.length))
  const expandedKeys = ref<string[]>([])
  let generation = 0

  function apply(ids: string[]) {
    if (loading.value || failed.value || props.busy) return
    const eligible = new Set(
      flattenHouseNodes(tree.value)
        .filter((node) => node.available && !node.added)
        .map((node) => node.key)
    )
    const next = [...new Set(ids)].filter((id) => eligible.has(id))
    if (next.length > remaining.value) {
      onlyMessage(t('Setting.houseTreeLimit', { count: remaining.value }), 'warning')
      return
    }
    selected.value = next
  }
  function check(keys: (string | number)[] | { checked: (string | number)[] },
    info?: { node: { key: string | number }; checked: boolean }) {
    // 独立勾选避免“选完下级自动选中父级房屋”；显式勾选目录才展开当前可见范围。
    if (info) {
      const node = flattenHouseNodes(visibleTree.value).find((row) => row.key === String(info.node.key))
      if (!node) return
      const ids = flattenHouseNodes([node]).filter((row) => row.available && !row.added).map((row) => row.key)
      apply(info.checked ? [...selected.value, ...ids] : selected.value.filter((id) => !ids.includes(id)))
      return
    }
    const visibleIds = new Set(visibleHouses.value.map((node) => node.key))
    const checked = Array.isArray(keys) ? keys : keys.checked
    // 搜索后勾选只变更可见房屋，保留此前已选的隐藏房屋。
    apply([
      ...selected.value.filter((id) => !visibleIds.has(id)),
      ...checked.map(String).filter((id) => visibleIds.has(id))
    ])
  }
  const selectAll = () => apply([...selected.value, ...visibleHouses.value.map((node) => node.key)])
  const clear = () => {
    if (!loading.value && !props.busy) selected.value = []
  }
  function expandMatches() {
    expandedKeys.value = keyword.value.trim()
      ? flattenHouseNodes(visibleTree.value)
          .filter((node) => node.children.length)
          .map((node) => node.key)
      : props.spaces.map((node) => node.id)
  }

  async function load() {
    const token = ++generation,
      project = props.projectId
    selected.value = []
    houses.value = new Map()
    failed.value = false
    loading.value = !!project && props.spaces.length > 0
    if (!loading.value) return
    const spaceIds = new Set<string>()
    const collect = (nodes: FinanceSpace[]) =>
      nodes.forEach((node) => {
        spaceIds.add(node.id)
        collect(node.children || [])
      })
    collect(props.spaces)
    try {
      const first = await querySettingHouses(project, { pageIndex: 0, pageSize: 200 })
      if (token !== generation) return
      const invalid = () => new Error(t('Setting.houseTreeChanged'))
      if (!Number.isInteger(first.total) || first.total < 0 || first.total > spaceIds.size) throw invalid()
      const found = new Map<string, HouseInfo>()
      const accept = (page: typeof first, index: number) => {
        const expected = Math.min(200, Math.max(0, first.total - index * 200))
        if (page.total !== first.total || page.data.length !== expected) throw invalid()
        for (const house of page.data) {
          if (!spaceIds.has(house.spaceId) || found.has(house.spaceId)) throw invalid()
          found.set(house.spaceId, house)
        }
      }
      accept(first, 0)
      // 接口每页最多200套；按授权空间数限定轮数，每批最多4个请求，全部成功才开放勾选。
      const pages = Math.ceil(first.total / 200)
      for (let index = 1; index < pages; index += 4) {
        const indexes = Array.from({ length: Math.min(4, pages - index) }, (_, offset) => index + offset)
        const results = await Promise.all(
          indexes.map((pageIndex) => querySettingHouses(project, { pageIndex, pageSize: 200 }))
        )
        if (token !== generation) return
        results.forEach((page, offset) => accept(page, indexes[offset]))
      }
      houses.value = found
      expandMatches()
    } catch (error) {
      if (token === generation) {
        failed.value = true
        onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
      }
    } finally {
      if (token === generation) loading.value = false
    }
  }
  watch(
    () => [props.projectId, props.spaces],
    () => void load(),
    { immediate: true }
  )
  watch(keyword, expandMatches)
  onScopeDispose(() => {
    ++generation
  })
  return {
    keyword,
    loading,
    failed,
    selected,
    checkedKeys,
    visibleTree,
    visibleHouses,
    remaining,
    expandedKeys,
    check,
    selectAll,
    clear,
    load
  }
}
