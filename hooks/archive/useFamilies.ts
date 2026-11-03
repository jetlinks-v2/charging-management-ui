import { onMounted, onScopeDispose, ref } from 'vue'
import { getFamilies, type Scope } from '../../api/archive'
export function useFamilies(scope: Scope) {
  const families = ref<{ id: string; name: string }[]>([])
  const failed = ref(false)
  const loading = ref(false)
  let generation = 0
  let disposed = false
  async function reload() {
    const token = ++generation
    loading.value = true
    failed.value = false
    try {
      const result = await getFamilies(scope)
      if (!disposed && token === generation) families.value = result
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  onMounted(() => {
    void reload()
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return { families, failed, loading, reload }
}
