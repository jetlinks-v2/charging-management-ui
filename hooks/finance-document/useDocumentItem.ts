import { computed, ref, watch } from 'vue'
import type { UploadChangeParam } from 'ant-design-vue'
import type { DifferenceVoucher, DocumentItem } from '../../api/financeDocument'
import { getImageUrl } from '@jetlinks-web-core/utils'
export function useDocumentItem(props: { item: DocumentItem }) {
  watch(
    () => props.item.collectionMethod,
    (method) => {
      if (method === 'FULL') {
        props.item.differenceAmount = '0.00'
        props.item.voucher = undefined
      } else if (!props.item.voucher)
        props.item.voucher = {
          type: '11',
          date: '',
          amount: '',
          attachmentFileId: '',
          attachmentFileName: ''
        }
    },
    { flush: 'sync' }
  )
}
export function useDocumentVoucher(props: { voucher: DifferenceVoucher }) {
  const files = ref<UploadChangeParam['fileList']>(
    props.voucher.attachmentFileId
      ? [
          {
            uid: props.voucher.attachmentFileId,
            name: props.voucher.attachmentFileName,
            status: 'done',
            url: getImageUrl(props.voucher.attachmentFileId)
          }
        ]
      : []
  )
  const invoiceVoucher = computed(() => ['10', '11'].includes(props.voucher.type))
  function change(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    props.voucher.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id || '' : ''
    props.voucher.attachmentFileName = props.voucher.attachmentFileId ? file.name : ''
  }
  return { files, invoiceVoucher, change }
}
