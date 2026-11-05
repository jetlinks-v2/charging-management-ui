import { computed, ref, watch } from 'vue'
import type { HouseContext } from '../../api/financeSetting'

export interface SettingTarget {
  context: HouseContext
  relationshipIds: string[]
}
export interface SettingTargetListState {
  targets: SettingTarget[]
  busy: boolean
  batch: boolean
  canChoose: boolean
}

/** 已选房屋为本地草稿，分页不丢收费对象；批量操作只使用每套房自己的客户关系。 */
export function useSettingTargetList(state: () => SettingTargetListState) {
  const page = ref(1)
  const pending = computed(() => state().targets.filter((row) => !row.relationshipIds.length).length)
  const hasCustomers = computed(() => state().targets.some((row) => row.context.customers.length > 0))
  const pagination = computed(() => ({
    current: page.value,
    pageSize: 5,
    hideOnSinglePage: true,
    showSizeChanger: false,
    onChange: (value: number) => {
      page.value = value
    }
  }))
  watch(
    () => state().targets.length,
    (count) => {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(count / 5)))
    }
  )
  function selectAllCustomers() {
    if (state().busy) return
    // 明确点击才扩大选择，多客户房屋不自动推断业主，也不跨房屋复制收费对象。
    state().targets.forEach((row) => {
      row.relationshipIds = row.context.customers.map((customer) => customer.relationshipId)
    })
  }
  function removeHouse(spaceId: string) {
    if (state().busy || !state().batch) return
    const index = state().targets.findIndex((row) => row.context.house.spaceId === spaceId)
    if (index >= 0) state().targets.splice(index, 1)
  }
  return { page, pagination, pending, hasCustomers, selectAllCustomers, removeHouse }
}
