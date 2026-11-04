import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { Query } from '../../api/archive'
import {
  getSettingOptions,
  getSetting,
  querySettings,
  saveSetting,
  batchSettings,
  deleteSetting,
  stopSetting,
  generateSetting,
  type ChargeSetting,
  type SettingOptions,
  type SettingInput
} from '../../api/financeSetting'
import { useArchiveScope, flattenSpaces } from '../archive/useArchiveScope'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'
interface SpaceTreeNode {
  key: string
  title: string
  children: SpaceTreeNode[]
}
export const settingPermission = 'charging/FinanceSetting'
export function useSettingWorkspace() {
  const { t } = useI18n()
  const archive = useArchiveScope()
  const options = ref<SettingOptions>({ projectSubjects: [], standards: [] })
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    readOnly = ref(true)
  const mode = ref<'single' | 'batch' | 'next'>('single')
  const detail = ref<ChargeSetting>()
  const metadataLoading = ref(false),
    metadataFailed = ref(false)
  const stopTarget = ref<ChargeSetting>()
  let metadataToken = 0,
    detailToken = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const tree = computed(() => {
    const map = (nodes: typeof archive.tree.value): SpaceTreeNode[] =>
      nodes.map((row) => ({
        key: row.id,
        title: row.spaceTypeName ? `${row.name} · ${row.spaceTypeName}` : row.name,
        children: map(row.children || [])
      }))
    return map(archive.visibleTree.value)
  })
  const params = computed(() => {
    const nodes = archive.selected.value ? flattenSpaces([archive.selected.value]).map((row) => row.id) : []
    return {
      terms: [...(terms.value || []), ...(nodes.length ? [{ column: 'spaceId', termType: 'in', value: nodes }] : [])],
      projectId: archive.projectId.value,
      sorts: [{ name: 'createTime', order: 'desc' }]
    }
  })
  async function metadata() {
    const project = archive.projectId.value,
      token = ++metadataToken
    options.value = { projectSubjects: [], standards: [] }
    metadataFailed.value = false
    if (!project) {
      metadataLoading.value = false
      return
    }
    metadataLoading.value = true
    try {
      const result = await getSettingOptions(project)
      if (!disposed && token === metadataToken) options.value = result
    } catch (error) {
      if (token === metadataToken) {
        metadataFailed.value = true
        notify(error)
      }
    } finally {
      if (token === metadataToken) metadataLoading.value = false
    }
  }
  async function select(row?: ChargeSetting, view = true, nextMode: typeof mode.value = 'single') {
    const project = archive.projectId.value,
      token = ++detailToken
    if (!project) return
    open.value = true
    readOnly.value = view
    mode.value = nextMode
    detail.value = undefined
    loading.value = !!row
    failed.value = false
    if (!row) return
    try {
      const result = await getSetting(project, row.id)
      if (!disposed && token === detailToken) detail.value = result
    } catch (error) {
      if (token === detailToken) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (token === detailToken) loading.value = false
    }
  }
  function close() {
    if (!saving.value) {
      ++detailToken
      open.value = false
    }
  }
  async function save(inputs: SettingInput[]) {
    if (saving.value || readOnly.value || loading.value || failed.value || metadataFailed.value || !inputs.length)
      return
    saving.value = true
    try {
      const project = archive.projectId.value
      const results =
        mode.value === 'batch'
          ? await batchSettings(project, inputs)
          : [
              await saveSetting(
                project,
                detail.value?.id,
                { ...inputs[0], version: detail.value?.version },
                mode.value === 'next'
              )
            ]
      onlyMessage(
        t('Setting.saved', {
          count: results.length,
          generated: results.reduce((sum, result) => sum + result.generated, 0)
        }),
        'success'
      )
      open.value = false
      reload()
    } catch (error) {
      notify(error)
    } finally {
      saving.value = false
    }
  }
  async function action(run: () => Promise<unknown>, success?: string) {
    if (saving.value) return
    saving.value = true
    try {
      await run()
      if (success) onlyMessage(t(success), 'success')
      reload()
    } catch (error) {
      notify(error)
    } finally {
      saving.value = false
    }
  }
  const remove = (row: ChargeSetting) => action(() => deleteSetting(archive.projectId.value, row), 'Setting.deleted')
  const generate = (row: ChargeSetting) =>
    action(async () => {
      const result = await generateSetting(archive.projectId.value, row.id)
      onlyMessage(t('Setting.generated', result), 'success')
    })
  async function stop(endDate: string) {
    if (!stopTarget.value) return
    const row = stopTarget.value
    await action(async () => {
      await stopSetting(archive.projectId.value, row, endDate)
      stopTarget.value = undefined
    }, 'Setting.stopped')
  }
  async function request(query: Query, config?: { signal: AbortSignal }) {
    if (!archive.projectId.value) return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
    return querySettings(archive.projectId.value, query, config?.signal)
  }
  useProjectSwitchGuard(() => !open.value && !saving.value && !stopTarget.value)
  watch(archive.projectId, () => {
    ++detailToken
    open.value = false
    detail.value = undefined
    stopTarget.value = undefined
    void metadata()
  })
  onMounted(() => {
    void metadata()
  })
  onScopeDispose(() => {
    disposed = true
    ++metadataToken
    ++detailToken
  })
  return {
    archive,
    tree,
    options,
    table,
    terms,
    params,
    open,
    loading,
    failed,
    saving,
    readOnly,
    mode,
    detail,
    metadataLoading,
    metadataFailed,
    stopTarget,
    metadata,
    reload,
    notify,
    select,
    close,
    save,
    remove,
    generate,
    stop,
    request
  }
}
