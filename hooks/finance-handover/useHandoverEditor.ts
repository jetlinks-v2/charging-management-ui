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
    attachments: [] as import('../../api/financeHandover').HandoverAttachment[],
    attachmentFileId: undefined as string | undefined,
    attachmentName: undefined as string | undefined
  })
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() =>
    files.value.some((file) => file.status !== 'done' || !file.response?.result?.id || file.response?.success === false)
  )
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    form.attachments = files.value
      .filter((file) => file.status === 'done' && file.response?.success !== false && file.response?.result?.id)
      .map((file) => ({
        fileId: file.response.result.id,
        name: file.name,
        size: file.size ?? file.response?.result?.length ?? 0
      }))
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
    items: [
      ...new Map(
        props.candidates.map((row) => [row.type + ':' + row.id, { type: row.type, id: row.id, version: row.version }])
      ).values()
    ],
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
        attachments: restored.attachments || [],
        attachmentFileId: restored.attachmentFileId,
        attachmentName: restored.attachmentName
      })
      if (restored.attachments?.length)
        files.value = restored.attachments.map((file) => ({
          uid: file.fileId,
          name: file.name,
          size: file.size ?? undefined,
          status: 'done' as const,
          url: getImageUrl(file.fileId),
          response: { result: { id: file.fileId } }
        }))
      else if (restored.attachmentFileId)
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
