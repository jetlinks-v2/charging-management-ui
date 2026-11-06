import { computed, ref } from 'vue'
import type { ActivitySpace } from '../../api/financeActivity'
import {
  activitySpaceTree,
  filterActivitySpaces,
  flattenActivitySpaces,
  activitySelectedLeaves
} from '../../utils/activitySpaces'

export function useActivitySpaces(props: { spaces: ActivitySpace[]; selectedIds: string[] }) {
  const keyword = ref('')
  const tree = computed(() => activitySpaceTree(props.spaces))
  // 弹窗仅编辑副本；持久化末端身份，让父级半选与单个房间取消保持一致。
  const selected = ref(activitySelectedLeaves(tree.value, props.selectedIds))
  const visibleTree = computed(() => filterActivitySpaces(tree.value, keyword.value))
  const expandedKeys = ref(
    props.spaces.filter((node) => !node.parentId || node.parentId === node.rootId).map((node) => node.id)
  )
  const expanded = computed(() => (keyword.value.trim() ? props.spaces.map((node) => node.id) : expandedKeys.value))
  function check(keys: (string | number)[] | { checked: (string | number)[] }) {
    const visibleLeaves = new Set(
      flattenActivitySpaces(visibleTree.value)
        .filter((node) => node.leaf && !node.children.length)
        .map((node) => node.id)
    )
    const checked = (Array.isArray(keys) ? keys : keys.checked).map(String)
    // 与收费设置批量选房一致，搜索只变更可见房间，保留此前选中的隐藏房间。
    selected.value = [
      ...new Set([
        ...selected.value.filter((id) => !visibleLeaves.has(id)),
        ...checked.filter((id) => visibleLeaves.has(id))
      ])
    ]
  }
  return { keyword, selected, visibleTree, expandedKeys, expanded, check }
}
