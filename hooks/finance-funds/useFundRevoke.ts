import { reactive, ref, watch, type MaybeRefOrGetter } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import {
  previewFundRevoke,
  confirmFundRevoke,
  type FundRevokeDraft,
  type FundRevokeInput,
  type FundRevokePreview
} from '../../api/financeFundRevoke'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { usePaymentRecovery } from '../finance-cashier/usePaymentRecovery'

export function useFundRevokeRecovery(project: MaybeRefOrGetter<string>) {
  return usePaymentRecovery<FundRevokeInput, FundRevokePreview>(
    project,
    'charging:pending-fund-revoke',
    (input) => !!input.sourceEntryId
  )
}
/** 撤销原存入整笔金额；未知结果使用原请求，不允许修改金额和原收款方式。 */
export function useFundRevoke(project: string, draft: FundRevokeDraft, saved: () => void) {
  const { t } = useI18n()
  const confirmation = usePaymentConfirmation(
    project,
    useFundRevokeRecovery(project),
    saved,
    { preview: previewFundRevoke, confirm: confirmFundRevoke },
    { unavailable: 'Funds.recoveryUnavailable', clearFailed: 'Funds.recoveryClearFailed', unknown: 'Funds.unknown' }
  )
  const model = reactive<FundRevokeInput>({
    sourceEntryId: draft.entry?.id || '',
    accountVersion: draft.account?.version || 0,
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
