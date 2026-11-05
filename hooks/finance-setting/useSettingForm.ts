import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FormInstance } from 'ant-design-vue'
import {
  getSettingHouse,
  type ChargeSetting,
  type SettingOptions,
  type SettingInput,
  type HouseContext
} from '../../api/financeSetting'
import { requestErrorMessage } from '../../utils/requestError'
export function useSettingForm(
  props: {
    projectId: string
    detail?: ChargeSetting
    options: SettingOptions
    initialSpace?: string
    mode: 'single' | 'batch' | 'next'
    readOnly: boolean
  },
  submitInputs: (inputs: SettingInput[]) => void
) {
  const { t } = useI18n()
  const form = ref<FormInstance>(),
    pickerOpen = ref(false),
    loadingHouse = ref(false)
  const targets = ref<{ context: HouseContext; relationshipIds: string[] }[]>([])
  const defaults = (): SettingInput => ({
    spaceId: '',
    projectSubjectId: '',
    standardId: '',
    customerRelationshipIds: [],
    effectiveStartDate: '',
    effectiveEndDate: null,
    variableValues: {},
    remark: ''
  })
  const model = reactive<SettingInput>(defaults())
  const standard = computed(() => props.options.standards.find((row) => row.id === model.standardId))
  const subjectOptions = computed(() =>
    props.options.projectSubjects.map((row) => ({
      value: row.id,
      label:
        props.options.standards.find((std) => std.subjectId === row.subjectId)?.subjectName || t('Setting.noStandard')
    }))
  )
  const availableStandards = computed(() => {
    const subject = props.options.projectSubjects.find((row) => row.id === model.projectSubjectId)
    return props.options.standards.filter((row) => row.subjectId === subject?.subjectId)
  })
  const editableVariables = computed(
    () =>
      standard.value?.variablesSnapshot.filter(
        (row) => !['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS'].includes(row.variableCode)
      ) || []
  )
  let token = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  async function addHouse(spaceId: string) {
    if (loadingHouse.value || targets.value.some((row) => row.context.house.spaceId === spaceId)) return
    const generation = ++token
    loadingHouse.value = true
    try {
      const context = await getSettingHouse(props.projectId, spaceId)
      if (disposed || generation !== token) return
      const previous = props.detail?.spaceId === spaceId ? props.detail.customerRelationshipIds : []
      const selected = previous.filter((id) => context.customers.some((row) => row.relationshipId === id))
      const relationshipIds = selected.length
        ? selected
        : context.customers.length === 1
          ? [context.customers[0].relationshipId]
          : []
      if (props.mode !== 'batch') targets.value = []
      targets.value.push({ context, relationshipIds })
      pickerOpen.value = false
    } catch (error) {
      if (!disposed && generation === token) notify(error)
    } finally {
      if (generation === token) loadingHouse.value = false
    }
  }
  watch(
    () => [props.detail, props.projectId, props.mode, props.readOnly] as const,
    () => {
      ++token
      loadingHouse.value = false
      targets.value = []
      Object.assign(model, defaults())
      if (props.readOnly) return
      if (props.detail) {
        const row = props.detail
        Object.assign(model, {
          projectSubjectId: row.projectSubjectId,
          standardId: row.standardId,
          effectiveStartDate: props.mode === 'next' ? '' : row.effectiveStartDate,
          effectiveEndDate: row.effectiveEndDate || null,
          remark: row.remark,
          variableValues: Object.fromEntries(
            Object.entries(row.snapshot.values).filter(
              ([key]) => !['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS'].includes(key)
            )
          )
        })
        void addHouse(row.spaceId)
      } else if (props.initialSpace && props.mode !== 'batch') void addHouse(props.initialSpace)
    },
    { immediate: true }
  )
  function changeSubject() {
    model.standardId = ''
    model.variableValues = {}
  }
  function changeStandard() {
    model.variableValues = {}
  }
  async function submit() {
    if (loadingHouse.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (!targets.value.length) {
      onlyMessage(t('Setting.chooseHouse'), 'warning')
      return
    }
    if (targets.value.some((row) => !row.relationshipIds.length)) {
      onlyMessage(t('Setting.chooseEveryCustomer'), 'warning')
      return
    }
    if (!standard.value || !model.projectSubjectId) {
      onlyMessage(t('Setting.chooseStandard'), 'warning')
      return
    }
    if (model.effectiveEndDate && model.effectiveStartDate > model.effectiveEndDate) {
      onlyMessage(t('Setting.dateOrder'), 'warning')
      return
    }
    // 固定变量由后端来源快照确定，前端只提交可编辑值，不发送展示金额作为正式入账依据。
    const variableValues = Object.fromEntries(
      editableVariables.value.map((row) => [row.variableCode, String(model.variableValues[row.variableCode] ?? '')])
    )
    submitInputs(
      targets.value.map((row) => ({
        ...model,
        variableValues,
        spaceId: row.context.house.spaceId,
        customerRelationshipIds: [...row.relationshipIds],
        effectiveEndDate: model.effectiveEndDate || null
      }))
    )
  }
  onScopeDispose(() => {
    disposed = true
    ++token
  })
  return {
    form,
    model,
    targets,
    pickerOpen,
    loadingHouse,
    standard,
    subjectOptions,
    availableStandards,
    editableVariables,
    addHouse,
    changeSubject,
    changeStandard,
    submit
  }
}
