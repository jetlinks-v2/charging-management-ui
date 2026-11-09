import { computed, onScopeDispose, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FormInstance } from 'ant-design-vue'
import {
  editHistoricalImportLine,
  type HistoricalImportRecord,
  type HistoricalImportLine
} from '../../api/financeReceivable'
import { editCollectionImportLine, type CollectionImportKind } from '../../api/financeCollectionImport'
import { collectionImportFields, historicalImportFields } from '../../utils/financeImportFields'
import { requestErrorMessage } from '../../utils/requestError'
import { formatFinanceTime } from '../../utils/financeTime'
import { useProjectSwitchGuard } from '../project/useProjectContext'

export function useImportLineEditor(
  props: { projectId: string; record: HistoricalImportRecord; line: HistoricalImportLine; kind?: CollectionImportKind },
  saved: (result: { record: HistoricalImportRecord; line: HistoricalImportLine }) => void
) {
  const { t } = useI18n(),
    form = ref<FormInstance>(),
    busy = ref(false)
  const fields = computed(() => (props.kind ? collectionImportFields(props.kind) : historicalImportFields))
  const original = { ...(props.kind ? props.line.payload : props.line.receivable) }
  const model = reactive<Record<string, string>>(
    Object.fromEntries(
      fields.value.map((field) => {
        const value = String(original[field.key as keyof typeof original] ?? '')
        const formatted = field.type === 'datetime' ? formatFinanceTime(value) : value
        return [field.key, formatted === '—' ? '' : formatted]
      })
    )
  )
  let disposed = false
  function rules(field: (typeof fields.value)[number]) {
    return [
      {
        required: !field.optional || (field.key === 'reductionReason' && /[1-9]/.test(model.reductionAmount || '')),
        message: t('Finance.required', { field: t(field.label) })
      },
      ...(['money', 'number'].includes(field.type || '')
        ? [
            {
              pattern: field.type === 'money' ? /^(0|[1-9]\d{0,17})(\.\d{1,2})?$/ : /^\d+(\.\d{1,4})?$/,
              message: t(
                field.type === 'number' ? 'CollectionImport.invalidQuantity' : 'CollectionImport.invalidAmount'
              )
            }
          ]
        : [])
    ]
  }
  async function submit() {
    if (busy.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    const start = model.calcStartDate || model.startDate,
      end = model.calcEndDate || model.endDate
    if (!!start !== !!end || (start && end && start > end)) {
      onlyMessage(t('CollectionImport.invalidDates'), 'error')
      return
    }
    if (
      props.kind &&
      model.quantity &&
      (!/^\d+(\.\d{1,4})?$/.test(model.quantity) ||
        !/[1-9]/.test(model.quantity) ||
        model.quantity.replace('.', '').replace(/^0+/, '').length > 12)
    ) {
      onlyMessage(t('CollectionImport.invalidQuantity'), 'error')
      return
    }
    if (props.kind && !/[1-9]/.test(model.amount || '')) {
      onlyMessage(t('CollectionImport.positiveAmount'), 'error')
      return
    }
    busy.value = true
    try {
      let result: { record: HistoricalImportRecord; line: HistoricalImportLine }
      if (props.kind) {
        const payload = { ...props.line.payload, ...model }
        // 可选空值必须省略，不能把空字符串作为金额，或把押金空标准当作已指定标准。
        for (const field of fields.value) if (field.optional && !model[field.key]?.trim()) delete payload[field.key]
        // 名称变化后必须删除旧标识，由服务器重新解析授权引用，避免沿用旧关联。
        const groups = [
          { names: ['fullName', 'customerName'], ids: ['spaceId', 'relationshipId', 'receivableId'] },
          {
            names: ['subjectName', 'standardName'],
            ids: ['subjectId', 'standardId', 'receivableId', 'companyId', 'companyName']
          },
          { names: ['startDate', 'endDate'], ids: ['receivableId'] },
          { names: ['companyName'], ids: ['companyId'] },
          { names: ['methodText', 'bankName'], ids: ['method', 'recordedId'] }
        ]
        for (const group of groups)
          if (
            group.names.some(
              (key) => key in model && (model[key] || '') !== String(original[key as keyof typeof original] ?? '')
            )
          )
            for (const key of group.ids) delete payload[key]
        result = await editCollectionImportLine(props.projectId, props.kind, props.record, props.line, payload)
      } else
        result = await editHistoricalImportLine(props.projectId, props.record, props.line, {
          fullName: model.fullName,
          customerName: model.customerName,
          subjectName: model.subjectName,
          standardName: model.standardName,
          calcStartDate: model.calcStartDate,
          calcEndDate: model.calcEndDate,
          accountPeriod: model.accountPeriod,
          dueDate: model.dueDate,
          contractReceivableAmount: model.contractReceivableAmount,
          feeReductionAmount: model.feeReductionAmount,
          actualReceivableAmount: model.actualReceivableAmount,
          remark: model.remark
        })
      if (disposed) return
      onlyMessage(t('CollectionImport.edited'), 'success')
      saved(result)
    } catch (error) {
      if (!disposed) onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    } finally {
      if (!disposed) busy.value = false
    }
  }
  useProjectSwitchGuard(() => false)
  onScopeDispose(() => {
    disposed = true
  })
  return { t, form, model, fields, busy, rules, submit }
}
