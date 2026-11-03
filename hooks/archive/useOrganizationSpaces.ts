import { requestErrorMessage } from '../../utils/requestError'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { bindSpaceRoot, getSpaceRoots, getSpaceRootTree, syncSpaces, type Space } from '../../api/archive'
export function useOrganizationSpaces(organizationId: () => string) {
  const { t } = useI18n()
  const roots = ref<Space[]>([])
  const loading = ref(false)
  const failed = ref(false)
  const saving = ref(false)
  const selected = ref<string>()
  const editing = ref(false)
  const previewOpen = ref(false)
  const treeLoading = ref(false)
  const treeFailed = ref(false)
  const tree = ref<Space[]>([])
  let generation = 0
  let previewGeneration = 0
  let disposed = false
  const bound = computed(() => roots.value.filter((root) => root.organizationId === organizationId()))
  const options = computed(() =>
    roots.value
      .filter((root) => root.parentId == null)
      .map((root) => ({ value: root.id, label: root.fullName || root.name, disabled: !!root.organizationId }))
  )
  async function reload() {
    const token = ++generation
    loading.value = true
    failed.value = false
    try {
      const result = await getSpaceRoots()
      if (!disposed && token === generation) roots.value = result
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  async function save(root: Space, clear = false) {
    if (saving.value) return
    const currentId = organizationId()
    saving.value = true
    try {
      await bindSpaceRoot(root.id, clear ? null : currentId, root.version)
      if (disposed || currentId !== organizationId()) return
      selected.value = undefined
      await reload()
      if (!clear) editing.value = false
    } catch (cause) {
      if (!disposed && currentId === organizationId()) {
        onlyMessage(requestErrorMessage(cause, t('Archive.saveFailed')), 'error')
        await reload()
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  const bind = () => {
    // 一对一：已有根时必须先显式解除，不能继续追加或隐式替换关联。
    if (bound.value.length || loading.value || failed.value) return
    const root = roots.value.find((item) => item.id === selected.value)
    if (root && root.parentId == null && !root.organizationId) return save(root)
  }
  function openEditor() {
    selected.value = undefined
    editing.value = true
  }
  let previewRoot: Space | undefined
  async function preview(candidate?: Space | unknown) {
    if (candidate && typeof candidate === 'object' && 'id' in candidate) previewRoot = candidate as Space
    const root = (previewRoot && bound.value.find((item) => item.id === previewRoot?.id)) || bound.value[0]
    if (!root) return
    const currentId = organizationId()
    const token = ++previewGeneration
    // 重开或重试预览时，旧请求不能覆盖本次打开的空间树。
    previewOpen.value = true
    treeLoading.value = true
    treeFailed.value = false
    tree.value = []
    try {
      const result = await getSpaceRootTree(root.id)
      if (!disposed && token === previewGeneration && currentId === organizationId()) tree.value = result
    } catch {
      if (!disposed && token === previewGeneration && currentId === organizationId()) treeFailed.value = true
    } finally {
      if (!disposed && token === previewGeneration && currentId === organizationId()) treeLoading.value = false
    }
  }
  async function synchronize() {
    if (saving.value) return
    saving.value = true
    try {
      await syncSpaces()
      await reload()
    } catch (cause) {
      if (!disposed) onlyMessage(requestErrorMessage(cause, t('Archive.syncFailed')), 'error')
    } finally {
      if (!disposed) saving.value = false
    }
  }
  onMounted(() => {
    void reload()
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    roots,
    loading,
    failed,
    saving,
    selected,
    bound,
    options,
    reload,
    save,
    bind,
    synchronize,
    editing,
    previewOpen,
    treeLoading,
    treeFailed,
    tree,
    openEditor,
    preview
  }
}
