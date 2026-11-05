import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryTaxImports, queryTaxLogs, type TaxImportRecord, type TaxOperation } from '../../api/financeTax'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
const changedFields = [
  'goodsName',
  'goodsShortName',
  'goodsCode',
  'classificationName',
  'taxRate',
  'specAndTypes',
  'unit',
  'price',
  'includingTaxFlag',
  'favouredPolicyFlag',
  'favouredPolicyName',
  'enabled'
]
export function useTaxHistory(props: { open: boolean; projectId: string; taxId?: string }) {
  const { t } = useI18n()
  const table = ref<{ reload: () => void }>()
  const companyFilter = ref<string>()
  const statusFilter = ref<string>()
  const params = computed(() => ({
    open: props.open,
    projectId: props.projectId,
    taxId: props.taxId,
    companyId: companyFilter.value,
    status: statusFilter.value
  }))
  const request = async (query: Query) => {
    if (!props.open || !props.projectId) return { success: true, result: { data: [], total: 0 } }
    const body: Query = {
      pageIndex: query.pageIndex,
      pageSize: query.pageSize,
      terms: props.taxId
        ? []
        : [
            ...(companyFilter.value
              ? [{ column: 'companyId', termType: 'eq', value: companyFilter.value }]
              : []),
            ...(statusFilter.value ? [{ column: 'status', termType: 'eq', value: statusFilter.value }] : [])
          ]
    }
    return props.taxId
      ? queryTaxLogs(props.projectId, props.taxId, body)
      : queryTaxImports(props.projectId, body)
  }
  const failure = (row: TaxImportRecord) => onlyMessage(row.errorMessage || t('FinanceTax.failed'), 'error')
  // 审计展示业务字段差异，避免把持久化JSON或内部字段名直接暴露给使用者。
  function changes(row: TaxOperation) {
    let before: Record<string, unknown> = {},
      after: Record<string, unknown> = {}
    try {
      before = JSON.parse(row.beforeSnapshot || '{}')
      after = JSON.parse(row.afterSnapshot || '{}')
    } catch {
      return t('FinanceTax.operation.' + row.operation)
    }
    const display = (key: string, value: unknown) => {
      if (value == null) return '—'
      if (key === 'enabled') return t('FinanceTax.' + (value ? 'active' : 'inactive'))
      if (key === 'taxRate') return Number((Number(value) * 100).toFixed(6)) + '%'
      if (key === 'includingTaxFlag') return t('FinanceTax.' + (value === 1 ? 'including' : 'excluding'))
      if (key === 'favouredPolicyFlag') return t('FinanceTax.' + (value === 1 ? 'yes' : 'no'))
      return String(value)
    }
    return changedFields
      .filter((key) => before[key] !== after[key])
      .map((key) => `${t('FinanceTax.' + key)}: ${display(key, before[key])} → ${display(key, after[key])}`)
      .join('；')
  }
  watch(
    () => props.open,
    (value) => {
      if (value) table.value?.reload()
    }
  )
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('FinanceTax.failed')), 'error')
  return { table, params, request, failure, changes, notify, companyFilter, statusFilter }
}
