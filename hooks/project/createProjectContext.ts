import { computed, readonly, ref } from 'vue'
import type { ProjectOption } from '../../api/project'

interface ProjectContextOptions {
  load: () => Promise<ProjectOption[]>
  identity: () => string
  read: (key: string) => string
  write: (key: string, id: string) => void
}

/** 一个应用会话共用一个项目；持久化值仅为偏好，必须经过当次授权列表核验。 */
export function createProjectContext(options: ProjectContextOptions) {
  const projects = ref<ProjectOption[]>([])
  const projectId = ref('')
  const loading = ref(false)
  const failed = ref(false)
  const switching = ref(false)
  const guards = new Set<() => boolean | Promise<boolean>>()
  let generation = 0
  let identity = ''
  let initialized = false
  const storageKey = (value: string) => `property:charging:project:${value}`
  const remember = (value: string) => {
    try {
      options.write(storageKey(identity), value)
    } catch {
      /* 存储不可用不妨碍当次选择。 */
    }
  }
  function reset() {
    generation++
    projectId.value = ''
    projects.value = []
    initialized = false
    failed.value = false
    loading.value = false
  }
  async function refresh() {
    const token = ++generation
    const requestIdentity = options.identity()
    if (identity !== requestIdentity) {
      identity = requestIdentity
      projectId.value = ''
      projects.value = []
      initialized = false
    }
    loading.value = true
    failed.value = false
    try {
      const result = await options.load()
      if (token !== generation || requestIdentity !== options.identity()) return
      projects.value = result
      let preferred = projectId.value
      if (!initialized) {
        try {
          preferred = options.read(storageKey(identity))
        } catch {
          preferred = ''
        }
      }
      projectId.value = result.some((item) => item.id === preferred)
        ? preferred
        : result.length === 1
          ? result[0].id
          : ''
      initialized = true
      remember(projectId.value)
    } catch (cause) {
      if (token === generation && requestIdentity === options.identity()) {
        failed.value = true
        projects.value = []
        projectId.value = ''
      }
      throw cause
    } finally {
      if (token === generation) loading.value = false
    }
  }
  async function select(id: string) {
    if (loading.value || switching.value || !projects.value.some((item) => item.id === id)) return false
    if (projectId.value === id) return true
    switching.value = true
    const token = generation
    try {
      for (const guard of guards) if (!(await guard())) return false
      if (token !== generation || identity !== options.identity()) return false
      projectId.value = id
      remember(id)
      return true
    } finally {
      switching.value = false
    }
  }
  return {
    projects: readonly(projects),
    projectId: readonly(projectId),
    loading: readonly(loading),
    failed: readonly(failed),
    switching: readonly(switching),
    current: computed(() => projects.value.find((item) => item.id === projectId.value)),
    refresh,
    select,
    reset,
    guard(check: () => boolean | Promise<boolean>) {
      guards.add(check)
      return () => {
        guards.delete(check)
      }
    }
  }
}
