import { computed, onMounted, onScopeDispose, reactive, ref, watch, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import type { PaymentRecord } from '../../api/financeCashier'
import type { FundsOptions } from '../../api/financeFunds'
import type { HouseContext } from '../../api/financeSetting'
import {
  getAdvanceSources,
  getAdvanceOptions,
  getAdvanceHouse,
  previewPaymentToAdvance,
  confirmPaymentToAdvance,
  type PaymentToAdvanceInput,
  type PaymentToAdvancePreview
} from '../../api/financePaymentToAdvance'
import { sumMoney } from '../../utils/receivableTotals'
import { refundableMoney } from '../../utils/refundMoney'
import { usePaymentConfirmation } from './usePaymentConfirmation'
import { usePaymentRecovery } from './usePaymentRecovery'

export function usePaymentToAdvanceRecovery(project: MaybeRefOrGetter<string>) {
  return usePaymentRecovery<PaymentToAdvanceInput, PaymentToAdvancePreview>(
    project,
    'charging:pending-to-advance',
    (input) => !!input.items?.length && !!input.spaceId
  )
}
/** 服务端重查原收款和目标档案；结果未知时只恢复原请求，不创建第二笔转存。 */
export function usePaymentToAdvance(project: string, rows: PaymentRecord[], saved: () => void) {
  const { t } = useI18n()
  const confirmation = usePaymentConfirmation(
    project,
    usePaymentToAdvanceRecovery(project),
    saved,
    { preview: previewPaymentToAdvance, confirm: confirmPaymentToAdvance },
    { unavailable: 'Funds.recoveryUnavailable', clearFailed: 'Funds.recoveryClearFailed', unknown: 'Funds.unknown' }
  )
  const model = reactive<PaymentToAdvanceInput>({
    items: [],
    companyId: '',
    targetCompanyId: '',
    spaceId: '',
    relationshipId: '',
    standardId: '',
    amount: '',
    occurredAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    reason: ''
  })
  const sourceRows = ref<PaymentRecord[]>(rows),
    form = ref<FormInstance>(),
    loading = ref(false),
    ready = ref(false),
    picker = ref(false)
  const house = ref<HouseContext>(),
    options = ref<FundsOptions>({ projectSubjects: [], standards: [], companies: [] })
  const files = ref<UploadChangeParam['fileList']>([])
  const availableStandards = computed(() =>
    options.value.standards.filter((s) => !model.targetCompanyId || s.companyId === model.targetCompanyId)
  )
  let disposed = false,
    generation = 0
  const restored = confirmation.restore()
  if (restored) Object.assign(model, restored)
  watch(model, confirmation.invalidate, { deep: true, flush: 'sync' })
  watch(
    () => model.targetCompanyId,
    () => {
      if (!confirmation.uncertain.value && !availableStandards.value.some((s) => s.id === model.standardId))
        model.standardId = ''
    }
  )
  async function pick(id: string) {
    const n = ++generation
    loading.value = true
    try {
      const value = await getAdvanceHouse(project, id)
      if (disposed || n !== generation) return
      house.value = value
      model.spaceId = id
      model.relationshipId = ''
      picker.value = false
    } catch (e) {
      if (!disposed && n === generation) confirmation.notify(e)
    } finally {
      if (!disposed && n === generation) loading.value = false
    }
  }
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id : undefined
    model.attachmentName = model.attachmentFileId ? file?.name : undefined
  }
  async function calculate() {
    if (!ready.value || loading.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (files.value.length && !model.attachmentFileId) {
      confirmation.notify(new Error(t('Funds.attachmentPending')))
      return
    }
    await confirmation.calculate({ ...model, items: model.items.map((i) => ({ ...i })) })
  }
  onMounted(async () => {
    if (restored || confirmation.failed.value) return
    loading.value = true
    try {
      const [receipts, choices] = await Promise.all([
        getAdvanceSources(
          project,
          rows.map((r) => r.line.id)
        ),
        getAdvanceOptions(project)
      ])
      if (disposed) return
      const company = receipts[0]?.companyId
      if (!company || receipts.some((r) => r.companyId !== company)) throw new Error(t('Refund.sameCompany'))
      sourceRows.value = receipts
      options.value = choices
      model.items = receipts.map((r) => ({ id: r.line.id, version: r.line.version }))
      model.companyId = company
      model.targetCompanyId = company
      model.amount = sumMoney(receipts.map((r) => refundableMoney(r.line)))
      ready.value = true
    } catch (e) {
      if (!disposed) confirmation.notify(e)
    } finally {
      if (!disposed) loading.value = false
    }
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    confirmation,
    model,
    sourceRows,
    form,
    files,
    filesChanged,
    calculate,
    loading,
    ready,
    picker,
    house,
    options,
    availableStandards,
    pick
  }
}
