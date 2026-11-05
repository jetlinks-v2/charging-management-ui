import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { getProjectCompanies, type ProjectCompany } from '../../api/finance'
import {
  getTaxItem,
  queryTaxItems,
  saveTaxItem,
  setTaxItemState,
  deleteTaxItems,
  getTaxTemplate,
  type TaxItem,
  type TaxInput
} from '../../api/financeTax'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { useTaxImport } from './useTaxImport'
export const taxPermission = 'charging/FinanceTax'

/** 统一项目与公司归属、请求竞态和写入守卫，组件只负责布局及事件分发。 */
export function useTaxCatalog() {
  const { t } = useI18n()
  const context = useProjectContext()
  const table = ref<{ reload: () => void }>()
  const companies = ref<ProjectCompany[]>([])
  const companyId = ref<string>()
  const terms = ref<Query['terms']>([])
  const selected = ref<TaxItem[]>([])
  const busy = ref(false)
  const companyLoading = ref(false)
  const companyFailed = ref(false)
  const open = ref(false)
  const readOnly = ref(true)
  const detail = ref<TaxItem>()
  const detailLoading = ref(false)
  const detailFailed = ref(false)
  const importsOpen = ref(false)
  let generation = 0
  let detailGeneration = 0
  let disposed = false
  let activeId: string | undefined
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('FinanceTax.failed')), 'error')
  const params = computed(() => ({
    projectId: context.projectId.value,
    terms: [
      ...(terms.value || []),
      ...(companyId.value ? [{ column: 'companyId', termType: 'eq', value: companyId.value }] : [])
    ],
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const companyOptions = computed(() =>
    companies.value.map(({ company }) => ({
      value: company.id,
      label: `${company.companyName} · ${company.taxNumber}`
    }))
  )
  const reload = () => {
    selected.value = []
    table.value?.reload()
  }
  const taxImport = useTaxImport(context.projectId, companyId, busy, reload)
  async function loadCompanies() {
    const token = ++generation
    companies.value = []
    companyFailed.value = false
    companyLoading.value = !!context.projectId.value
    if (!context.projectId.value) return
    try {
      const rows = await getProjectCompanies(context.projectId.value)
      if (!disposed && token === generation) companies.value = rows
    } catch (cause) {
      if (!disposed && token === generation) {
        companyFailed.value = true
        notify(cause)
      }
    } finally {
      if (token === generation) companyLoading.value = false
    }
  }
  async function select(key?: string, view = true) {
    if (busy.value || !context.projectId.value) return
    const token = ++detailGeneration
    activeId = key
    open.value = true
    readOnly.value = view
    detail.value = undefined
    detailFailed.value = false
    detailLoading.value = !!key
    if (!key) return
    try {
      const row = await getTaxItem(context.projectId.value, key)
      if (!disposed && token === detailGeneration) detail.value = row
    } catch (cause) {
      if (!disposed && token === detailGeneration) {
        detailFailed.value = true
        notify(cause)
      }
    } finally {
      if (token === detailGeneration) detailLoading.value = false
    }
  }
  function close() {
    if (busy.value) return
    detailGeneration++
    open.value = false
    detail.value = undefined
  }
  async function run(operation: () => Promise<unknown>, message: string) {
    if (busy.value || !context.projectId.value) return
    busy.value = true
    try {
      await operation()
      onlyMessage(message, 'success')
      open.value = false
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      busy.value = false
    }
  }
  const save = (input: TaxInput) => {
    if (readOnly.value || detailLoading.value || detailFailed.value) return
    return run(
      () => saveTaxItem(context.projectId.value, activeId, input),
      t('FinanceTax.saved', { name: input.goodsName })
    )
  }
  const toggle = (row: TaxItem) =>
    run(
      () => setTaxItemState(context.projectId.value, row),
      t('FinanceTax.stateSaved', { name: row.goodsName })
    )
  const remove = (rows: TaxItem[]) =>
    run(() => deleteTaxItems(context.projectId.value, rows), t('FinanceTax.deleted', { count: rows.length }))
  async function request(query: Query, input?: { signal: AbortSignal }) {
    if (!context.projectId.value)
      return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
    const { projectId: _projectId, ...body } = query as Query & { projectId?: string }
    return queryTaxItems(context.projectId.value, body, input?.signal)
  }
  async function template() {
    if (busy.value) return
    busy.value = true
    try {
      const blob = await getTaxTemplate(context.projectId.value)
      const url = URL.createObjectURL(blob)
      try {
        downloadFileByUrl(url, t('FinanceTax.templateFile'), 'xlsx')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('FinanceTax.failed')), 'error')
    } finally {
      busy.value = false
    }
  }
  useProjectSwitchGuard(() => !busy.value && !taxImport.importOpen.value && (!open.value || readOnly.value))
  watch(
    context.projectId,
    () => {
      close()
      importsOpen.value = false
      companyId.value = undefined
      terms.value = []
      selected.value = []
      void loadCompanies()
    },
    { immediate: true }
  )
  watch(companyId, () => {
    selected.value = []
  })
  void context.refresh().catch(notify)
  onScopeDispose(() => {
    disposed = true
    generation++
    detailGeneration++
  })
  return {
    projectId: context.projectId,
    table,
    companies,
    companyOptions,
    companyId,
    terms,
    params,
    selected,
    busy,
    companyLoading,
    companyFailed,
    open,
    readOnly,
    detail,
    detailLoading,
    detailFailed,
    importsOpen,
    loadCompanies,
    reload,
    select,
    close,
    save,
    toggle,
    remove,
    request,
    template,
    ...taxImport,
    notify,
    retry: () => select(activeId, readOnly.value)
  }
}
