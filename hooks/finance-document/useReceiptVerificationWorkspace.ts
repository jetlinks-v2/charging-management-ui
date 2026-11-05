import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  type DocumentRecord,
  type DocumentType,
  type ReceiptVerificationInput,
  type ReceiptVerificationPreview
} from '../../api/financeDocument'
import { useDocumentRecovery } from './useDocumentRecovery'

export function useReceiptVerificationWorkspace(projectId: Ref<string>, type: DocumentType) {
  const { t } = useI18n()
  const open = ref(false),
    pending = ref(false),
    failed = ref(false)
  const selected = ref<DocumentRecord[]>([]),
    targets = ref<DocumentRecord[]>([])
  const recovery = useDocumentRecovery<ReceiptVerificationInput, ReceiptVerificationPreview>(
    projectId,
    'RECEIPT',
    'verify'
  )
  const blocked = computed(() => open.value || pending.value || failed.value)
  function check() {
    if (type !== 'RECEIPT') return
    try {
      pending.value = !!recovery.read()
      failed.value = false
    } catch {
      failed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function start(rows: DocumentRecord[]) {
    if (!projectId.value || type !== 'RECEIPT' || blocked.value || !rows.length) return
    if (rows.length > 100) {
      onlyMessage(t('Verification.limit'), 'warning')
      return
    }
    targets.value = [...rows]
    open.value = true
  }
  function recover() {
    try {
      const saved = recovery.read()
      if (saved) {
        targets.value = saved.preview.documents
        open.value = true
      }
    } catch {
      failed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function close() {
    open.value = false
    targets.value = []
    check()
  }
  function changed(_keys: (string | number)[], rows: DocumentRecord[]) {
    if (rows.length > 100) {
      onlyMessage(t('Verification.limit'), 'warning')
      return
    }
    selected.value = rows
  }
  watch(
    projectId,
    () => {
      open.value = false
      targets.value = []
      selected.value = []
      check()
    },
    { immediate: true }
  )
  return { open, pending, failed, selected, targets, blocked, check, start, recover, close, changed }
}
