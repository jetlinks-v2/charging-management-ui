import { computed, ref, watch } from 'vue'
import type { ProjectOption } from '../../api/project'

export interface ProjectPickerState {
  open: boolean
  projects: readonly ProjectOption[]
  currentId: string
  selectedIds?: readonly string[]
  multiple?: boolean
  loading: boolean
  switching: boolean
}

/** 项目作为候选项，组织只负责定位；跨组织、跨页选择在确认前始终是草稿。 */
export function useProjectPicker(props: ProjectPickerState) {
  const pending = ref<string[]>([])
  const keyword = ref('')
  const organization = ref('')
  const page = ref(1)
  interface TreeNode {
    key: string
    title: string
    children: TreeNode[]
  }
  const tree = computed(() => {
    const roots: TreeNode[] = [],
      nodes = new Map<string, TreeNode>()
    const projectIds = new Set(props.projects.map((p) => p.id))
    for (const project of props.projects) {
      let children = roots
      for (const item of project.organizationPath || []) {
        if (item.isProject || projectIds.has(item.id)) continue
        let node = nodes.get(item.id)
        if (!node) {
          node = { key: item.id, title: item.name, children: [] }
          nodes.set(item.id, node)
          children.push(node)
        }
        children = node.children
      }
    }
    return roots
  })
  const path = (project: ProjectOption) =>
    project.organizationPath?.map((item) => item.name).join(' / ') || project.name
  const matches = computed(() =>
    props.projects.filter(
      (project) =>
        (!organization.value || project.organizationPath?.some((item) => item.id === organization.value)) &&
        `${project.name} ${path(project)}`.toLocaleLowerCase().includes(keyword.value.trim().toLocaleLowerCase())
    )
  )
  const visible = computed(() => matches.value.slice((page.value - 1) * 6, page.value * 6))
  const candidates = computed(() => props.projects.filter((project) => pending.value.includes(project.id)))
  const allMatched = computed(() => !!matches.value.length && matches.value.every((p) => pending.value.includes(p.id)))
  const exceedsLimit = computed(() => new Set([...pending.value, ...matches.value.map((p) => p.id)]).size > 100)
  function toggle(id: string) {
    if (props.loading || props.switching || !props.projects.some((p) => p.id === id)) return
    pending.value = props.multiple
      ? pending.value.includes(id)
        ? pending.value.filter((item) => item !== id)
        : pending.value.length < 100
          ? [...pending.value, id]
          : pending.value
      : [id]
  }
  function toggleMatched() {
    if (props.loading || props.switching) return
    const ids = new Set(matches.value.map((p) => p.id))
    if (allMatched.value) pending.value = pending.value.filter((id) => !ids.has(id))
    else if (!exceedsLimit.value) pending.value = [...new Set([...pending.value, ...ids])]
  }
  watch([keyword, organization], () => {
    page.value = 1
  })
  watch(
    () => props.open,
    (open) => {
      if (!open) return
      pending.value = props.multiple ? [...(props.selectedIds || [])] : props.currentId ? [props.currentId] : []
      keyword.value = ''
      organization.value = ''
      page.value = 1
    },
    { immediate: true }
  )
  watch(
    () => props.projects,
    () => {
      pending.value = pending.value.filter((id) => props.projects.some((p) => p.id === id))
      page.value = 1
    }
  )
  const selectOrganization = (keys: (string | number)[]) => {
    organization.value = keys.length ? String(keys[0]) : ''
  }
  return {
    pending,
    keyword,
    organization,
    page,
    tree,
    path,
    matches,
    visible,
    candidates,
    allMatched,
    exceedsLimit,
    toggle,
    toggleMatched,
    selectOrganization
  }
}
