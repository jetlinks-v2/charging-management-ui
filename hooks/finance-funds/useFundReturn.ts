import { reactive, ref, watch, type MaybeRefOrGetter } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import {
  previewFundReturn,
  confirmFundReturn,
  type FundReturnDraft,
  type FundReturnInput,
  type FundReturnPreview
} from '../../api/financeFundReturn'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { usePaymentRecovery } from '../finance-cashier/usePaymentRecovery'

export function useFundReturnRecovery(project: MaybeRefOrGetter<string>) {
  return usePaymentRecovery<FundReturnInput, FundReturnPreview>(
    project,
    'charging:pending-fund-return',
    (input) => !!input.sourceEntryId
  )
}
/** 只引用原冲抵流水；未知结果复用原请求，不能改成退到其他账户或现金。 */
export function useFundReturn(project: string, draft: FundReturnDraft, saved: () => void) {
  const { t } = useI18n()
  const confirmation = usePaymentConfirmation(
    project,
    useFundReturnRecovery(project),
    saved,
    { preview: previewFundReturn, confirm: confirmFundReturn },
    { unavailable: 'Funds.recoveryUnavailable', clearFailed: 'Funds.recoveryClearFailed', unknown: 'Funds.unknown' }
  )
  const model = reactive<FundReturnInput>({
    sourceEntryId: draft.entry?.id || '',
    accountVersion: draft.account?.version || 0,
    amount: draft.entry?.amount.replace(/^-/, '') || '',
    occurredAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    reason: ''
  })
  const restored = confirmation.restore()
  if (restored) Object.assign(model, restored)
  const form = ref<FormInstance>(),
    files = ref<UploadChangeParam['fileList']>([])
  watch(model, confirmation.invalidate, { deep: true, flush: 'sync' })
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id : undefined
    model.attachmentName = model.attachmentFileId ? file?.name : undefined
  }
  async function calculate() {
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (files.value.length && !model.attachmentFileId) {
      confirmation.notify(new Error(t('Funds.attachmentPending')))
      return
    }
    await confirmation.calculate({ ...model })
  }
  return { confirmation, model, form, files, filesChanged, calculate }
}
