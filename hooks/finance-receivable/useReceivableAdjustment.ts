import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  previewAdjustment,
  submitAdjustment,
  type AdjustmentInput,
  type AdjustmentPreview,
  type Receivable
} from '../../api/financeReceivable'
import { requestErrorMessage } from '../../utils/requestError'

/** 确认绑定后端预览与完整输入；任何编辑、上传或迟到响应都不能复用过期金额。 */
export function useReceivableAdjustment(props: { projectId: string; detail: Receivable }, saved: () => void) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const preview = ref<AdjustmentPreview>()
  const calculating = ref(false),
    saving = ref(false)
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() => files.value.some((file) => file.status === 'uploading'))
  const invalidFiles = computed(() =>
    files.value.some((file) => file.status !== 'done' || !file.response?.result?.id || file.response?.success === false)
  )
  const variables = computed(
    () => props.detail.snapshot?.standard.variablesSnapshot.filter((row) => row.variableCode !== 'PERIOD_MONTHS') || []
  )
  const model = reactive<AdjustmentInput>({
    version: props.detail.version,
    adjustmentMode: 'DIRECT',
    directDirection: 'INCREASE',
    directAmount: '',
    formulaLine: {
      subjectId: props.detail.subjectId,
      standardId: props.detail.standardId,
      afterCalcStartDate: props.detail.calcStartDate,
      afterCalcEndDate: props.detail.calcEndDate,
      afterVariableValues: { ...props.detail.snapshot?.values }
    },
    assessmentAmount: '',
    temporaryDispatchCount: 0,
    temporaryDispatchUnitPrice: '',
    calculationAsOfDate: dayjs().format('YYYY-MM-DD'),
    feeReductionAmount: '',
    lateFeeReductionAmount: '',
    lateFeeReductionReason: '',
    reason: '',
    remark: '',
    attachmentFileIds: [],
    attachmentNames: {}
  })
  // 月数只由日期推导，不能把展示值回传成可编辑变量。
  delete model.formulaLine.afterVariableValues.PERIOD_MONTHS
  let generation = 0,
    disposed = false,
    confirmedInput: AdjustmentInput | undefined
  let confirmedFingerprint = ''
  const input = (): AdjustmentInput => JSON.parse(JSON.stringify(model))
  function invalidate() {
    ++generation
    preview.value = undefined
    confirmedInput = undefined
    confirmedFingerprint = ''
  }
  watch(model, invalidate, { deep: true, flush: 'sync' })
  watch(() => [props.projectId, props.detail.id, props.detail.version], invalidate)
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    model.attachmentFileIds = []
    model.attachmentNames = {}
    for (const file of info.fileList) {
      const key = file.response?.result?.id
      if (file.status === 'done' && typeof key === 'string' && file.response?.success !== false) {
        model.attachmentFileIds.push(key)
        model.attachmentNames[key] = file.name
      }
    }
    invalidate()
  }
  async function calculate() {
    if (saving.value || calculating.value || uploading.value || invalidFiles.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    invalidate()
    const token = generation,
      project = props.projectId,
      key = props.detail.id,
      submitted = input()
    calculating.value = true
    try {
      const result = await previewAdjustment(project, key, submitted)
      if (disposed || token !== generation) return
      preview.value = result
      confirmedInput = submitted
      confirmedFingerprint = JSON.stringify(submitted)
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed) calculating.value = false
    }
  }
  async function submit() {
    if (!preview.value || !confirmedInput || saving.value || calculating.value || uploading.value || invalidFiles.value)
      return
    if (JSON.stringify(input()) !== confirmedFingerprint) {
      invalidate()
      return
    }
    const submitted = confirmedInput,
      token = preview.value.token
    saving.value = true
    try {
      await submitAdjustment(props.projectId, props.detail.id, submitted, token)
      if (!disposed) {
        onlyMessage(t('Adjustment.saved'), 'success')
        saved()
      }
    } catch (error) {
      if (!disposed) {
        invalidate()
        notify(error)
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    invalidate()
  })
  return {
    model,
    form,
    preview,
    calculating,
    saving,
    files,
    uploading,
    invalidFiles,
    variables,
    calculate,
    submit,
    invalidate,
    filesChanged
  }
}
