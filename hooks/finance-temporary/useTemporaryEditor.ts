import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import {
  getTemporaryOptions,
  getTemporaryHouse,
  previewTemporary,
  collectTemporary,
  type TemporaryInput,
  type TemporaryOptions
} from '../../api/financeTemporary'
import type { HouseContext } from '../../api/financeSetting'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useTemporaryRecovery } from './useTemporaryRecovery'
import { sumMoney } from '../../utils/receivableTotals'
/** 当前房屋客户只用于新收款，未知请求直接使用原预览恢复，禁止更换来源。 */
export function useTemporaryEditor(props: { projectId: string; initialSpace?: string }, saved: () => void) {
  const { t } = useI18n(),
    form = ref<FormInstance>(),
    loading = ref(false),
    picker = ref(false),
    house = ref<HouseContext>()
  const options = ref<TemporaryOptions>({ projectSubjects: [], standards: [], companies: [] })
  const confirmation = usePaymentConfirmation(
    props.projectId,
    useTemporaryRecovery(() => props.projectId),
    saved,
    { preview: previewTemporary, confirm: collectTemporary },
    {
      unavailable: 'Cashier.recoveryUnavailable',
      clearFailed: 'Cashier.recoveryClearFailed',
      unknown: 'Cashier.unknownResult'
    }
  )
  const model = reactive({
    spaceId: '',
    relationshipId: '',
    standardId: '',
    subjectId: undefined as string | undefined,
    companyId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    accountPeriod: dayjs().format('YYYY-MM'),
    quantity: undefined as string | undefined,
    amount: '',
    paidAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    payerName: '',
    remark: '',
    attachmentFileId: undefined as string | undefined,
    attachmentName: undefined as string | undefined,
    tenders: [] as { optionId: string; amount: string }[]
  })
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() => files.value.some((v) => v.status === 'uploading'))
  const invalidFiles = computed(() =>
    files.value.some((v) => v.status !== 'done' || !v.response?.result?.id || v.response?.success === false)
  )
  const funding = computed(() => options.value.companies.find((v) => v.id === model.companyId)?.funding || [])
  const availableStandards = computed(() =>
    options.value.standards.filter(
      (v) => !!model.subjectId && v.subjectId === model.subjectId && v.companyId === model.companyId
    )
  )
  const subjects = computed(() => [
    ...new Map(
      options.value.standards
        .filter((v) => !!v.subjectId && v.companyId === model.companyId)
        .map((v) => [v.subjectId, { id: v.subjectId, name: v.subjectName }])
    ).values()
  ])
  // 公司由项目默认配置提供，科目仅控制标准；恢复中的原请求保持不变。
  watch(
    () => model.subjectId,
    () => {
      if (confirmation.uncertain.value) return
      if (options.value.standards.find((v) => v.id === model.standardId)?.subjectId !== model.subjectId) {
        model.standardId = ''
      }
    },
    { flush: 'sync' }
  )
  watch(
    () => model.standardId,
    () => {
      if (confirmation.uncertain.value) return
      const standard = options.value.standards.find((v) => v.id === model.standardId)
      if (standard) {
        model.subjectId = standard.subjectId
      }
    },
    { flush: 'sync' }
  )
  const total = computed(() => {
    try {
      return sumMoney([model.amount || '0'])
    } catch {
      return ''
    }
  })
  const tenderTotal = computed(() => {
    try {
      return sumMoney(model.tenders.map((v) => v.amount || '0'))
    } catch {
      return ''
    }
  })
  const balanced = computed(() => !!total.value && total.value !== '0.00' && total.value === tenderTotal.value)
  let disposed = false,
    houseToken = 0
  watch(model, () => confirmation.invalidate(), { deep: true, flush: 'sync' })
  watch(
    () => model.amount,
    () => {
      if (!confirmation.uncertain.value && model.tenders.length === 1) model.tenders[0].amount = model.amount
    },
    { flush: 'sync' }
  )
  watch(
    () => model.companyId,
    () => {
      if (confirmation.uncertain.value) return
      if (options.value.standards.find((v) => v.id === model.standardId)?.companyId !== model.companyId)
        model.standardId = ''
      const first = funding.value[0]
      model.tenders = first ? [{ optionId: first.id, amount: model.amount }] : []
    }
  )
  watch(
    () => model.relationshipId,
    () => {
      const customer = house.value?.customers.find((v) => v.relationshipId === model.relationshipId)
      if (customer) model.payerName = customer.name
    }
  )
  async function pick(space: string) {
    const token = ++houseToken
    model.spaceId = space
    model.relationshipId = ''
    model.payerName = ''
    house.value = undefined
    loading.value = true
    try {
      const value = await getTemporaryHouse(props.projectId, space)
      if (!disposed && token === houseToken) {
        house.value = value
        picker.value = false
      }
    } catch (e) {
      if (!disposed && token === houseToken) confirmation.notify(e)
    } finally {
      if (!disposed && token === houseToken) loading.value = false
    }
  }
  function addTender() {
    const option = funding.value.find((v) => !model.tenders.some((item) => item.optionId === v.id))
    if (option && model.tenders.length < 10) model.tenders.push({ optionId: option.id, amount: '0.00' })
  }
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id : undefined
    model.attachmentName = model.attachmentFileId ? file.name : undefined
  }
  function input(): TemporaryInput {
    return {
      ...model,
      tenders: model.tenders.map((v) => {
        const option = funding.value.find((item) => item.id === v.optionId)
        if (!option) throw new Error(t('Cashier.chooseFunding'))
        return { method: option.method, recordedId: option.recordedId, amount: v.amount }
      })
    }
  }
  async function calculate() {
    if (loading.value || uploading.value || invalidFiles.value || !balanced.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    try {
      await confirmation.calculate(input())
    } catch (e) {
      confirmation.notify(e)
    }
  }
  onMounted(async () => {
    const restored = confirmation.restore()
    if (restored) {
      Object.assign(model, {
        ...restored,
        tenders: restored.tenders.map((v) => ({ optionId: v.recordedId || v.method, amount: v.amount }))
      })
      return
    }
    if (confirmation.failed.value) return
    loading.value = true
    try {
      const value = await getTemporaryOptions(props.projectId)
      if (disposed) return
      options.value = value
      if (value.companies.length === 1) model.companyId = value.companies[0].id
      if (props.initialSpace) await pick(props.initialSpace)
    } catch (e) {
      if (!disposed) confirmation.notify(e)
    } finally {
      if (!disposed) loading.value = false
    }
  })
  onScopeDispose(() => {
    disposed = true
    ++houseToken
  })
  return {
    t,
    form,
    loading,
    picker,
    house,
    options,
    model,
    funding,
    availableStandards,
    subjects,
    confirmation,
    total,
    tenderTotal,
    balanced,
    files,
    uploading,
    invalidFiles,
    pick,
    addTender,
    filesChanged,
    calculate
  }
}
