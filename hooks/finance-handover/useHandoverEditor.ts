import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { UploadChangeParam } from 'ant-design-vue'
import { getImageUrl } from '@jetlinks-web-core/utils'
import dayjs from 'dayjs'
import {
  confirmHandover,
  previewHandover,
  type HandoverInput,
  type HandoverPreview,
  type HandoverCandidate
} from '../../api/financeHandover'
import type { PaymentRecovery } from '../../api/paymentConfirmation'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useHandoverRecovery } from './useHandoverRecovery'

export function useHandoverEditor(
  props: { projectId: string; candidates: HandoverCandidate[] },
  saved: () => void,
  recovery?: PaymentRecovery<HandoverInput, HandoverPreview>
) {
  const form = reactive({
    closingDate: dayjs().format('YYYY-MM-DD'),
    remark: '',
    attachmentFileId: undefined as string | undefined,
    attachmentName: undefined as string | undefined
  })
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() =>
    files.value.some((file) => file.status !== 'done' || !file.response?.result?.id || file.response?.success === false)
  )
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = files.value[0]
    form.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id || undefined : undefined
    form.attachmentName = form.attachmentFileId ? file.name : undefined
  }
  const confirmation = usePaymentConfirmation(
    props.projectId,
    recovery || useHandoverRecovery<HandoverInput, HandoverPreview>(() => props.projectId, 'create'),
    saved,
    { preview: previewHandover, confirm: confirmHandover },
    { unavailable: 'Document.recoveryUnavailable', clearFailed: 'Document.clearFailed', unknown: 'Handover.unknown' }
  )
  const locked = computed(
    () =>
      confirmation.saving.value ||
      confirmation.calculating.value ||
      confirmation.uncertain.value ||
      confirmation.failed.value ||
      !!confirmation.result.value
  )
  const canClose = computed(
    () =>
      !confirmation.saving.value &&
      !confirmation.calculating.value &&
      !confirmation.uncertain.value &&
      !confirmation.failed.value
  )
  const input = (): HandoverInput => ({
    items: props.candidates.map((row) => ({ type: row.type, id: row.id, version: row.version })),
    ...form,
    remark: form.remark.trim() || undefined
  })
  watch(form, () => {
    if (!locked.value) confirmation.invalidate()
  })
  async function calculate() {
    if (
      !form.closingDate ||
      !props.candidates.length ||
      props.candidates.length > 100 ||
      locked.value ||
      uploading.value
    )
      return
    await confirmation.calculate(input())
  }
  onMounted(() => {
    const restored = confirmation.restore()
    if (restored) {
      Object.assign(form, {
        closingDate: restored.closingDate,
        remark: restored.remark || '',
        attachmentFileId: restored.attachmentFileId,
        attachmentName: restored.attachmentName
      })
      if (restored.attachmentFileId)
        files.value = [
          {
            uid: restored.attachmentFileId,
            name: restored.attachmentName || '',
            status: 'done',
            url: getImageUrl(restored.attachmentFileId),
            response: { result: { id: restored.attachmentFileId } }
          }
        ]
    }
  })
  return { form, files, filesChanged, uploading, ...confirmation, calculate, locked, canClose }
}
