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
  const rules = ref<SettingInput[]>([model])
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
  async function addHouses(spaceIds: string[]) {
    if (loadingHouse.value || props.readOnly) return
    const ids = [...new Set(spaceIds)].filter((id) => !targets.value.some((row) => row.context.house.spaceId === id))
    if (!ids.length) {
      pickerOpen.value = false
      return
    }
    if ((props.mode === 'batch' ? targets.value.length + ids.length : ids.length) * rules.value.length > 200) {
      onlyMessage(t('Setting.batchLimit'), 'warning')
      return
    }
    const generation = ++token
    loadingHouse.value = true
    try {
      // 所有来源加载通过才更新选择，避免批量加载失败时悄悄遗漏房屋。
      const contexts: HouseContext[] = []
      for (let offset = 0; offset < ids.length; offset += 20) {
        contexts.push(
          ...(await Promise.all(
            ids.slice(offset, offset + 20).map(async (id) => {
              try {
                return await getSettingHouse(props.projectId, id)
              } catch (error) {
                throw new Error(id + ': ' + requestErrorMessage(error, t('Finance.failed')))
              }
            })
          ))
        )
        if (disposed || generation !== token) return
      }
      const additions = contexts.map((context) => {
        const previous = props.detail?.spaceId === context.house.spaceId ? props.detail.customerRelationshipIds : []
        const selected = previous.filter((id) => context.customers.some((row) => row.relationshipId === id))
        return {
          context,
          relationshipIds: selected.length
            ? selected
            : context.customers.length === 1
              ? [context.customers[0].relationshipId]
              : []
        }
      })
      targets.value = props.mode === 'batch' ? [...targets.value, ...additions] : additions.slice(0, 1)
      pickerOpen.value = false
    } catch (error) {
      if (!disposed && generation === token) notify(error)
    } finally {
      if (generation === token) loadingHouse.value = false
    }
  }
  const addHouse = (spaceId: string) => addHouses([spaceId])
  watch(
    () => [props.detail, props.projectId, props.mode, props.readOnly] as const,
    () => {
      ++token
      loadingHouse.value = false
      targets.value = []
      Object.assign(model, defaults())
      rules.value = [model]
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
    if (loadingHouse.value || props.readOnly) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (!targets.value.length) {
      onlyMessage(t('Setting.chooseHouse'), 'warning')
      return
    }
    if (
      targets.value.some(
        (row) =>
          !row.relationshipIds.length ||
          row.relationshipIds.some((id) => !row.context.customers.some((customer) => customer.relationshipId === id))
      )
    ) {
      onlyMessage(t('Setting.chooseEveryCustomer'), 'warning')
      return
    }
    if (targets.value.length * rules.value.length > 200) {
      onlyMessage(t('Setting.batchLimit'), 'warning')
      return
    }
    const inputs: SettingInput[] = []
    for (const rule of rules.value) {
      const selected = props.options.standards.find((row) => row.id === rule.standardId)
      const subject = props.options.projectSubjects.find((row) => row.id === rule.projectSubjectId)
      if (!selected || selected.subjectId !== subject?.subjectId) {
        onlyMessage(t('Setting.chooseStandard'), 'warning')
        return
      }
      if (!rule.effectiveStartDate || (rule.effectiveEndDate && rule.effectiveStartDate > rule.effectiveEndDate)) {
        onlyMessage(t('Setting.dateOrder'), 'warning')
        return
      }
      const variables = selected.variablesSnapshot.filter(
        (row) => !['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS'].includes(row.variableCode)
      )
      if (
        variables.some(
          (row) => rule.variableValues[row.variableCode] === '' || rule.variableValues[row.variableCode] == null
        )
      ) {
        onlyMessage(t('Setting.completeVariables'), 'warning')
        return
      }
      // 固定变量由后端快照确定，金额正式计算仍由后端执行。
      const variableValues = Object.fromEntries(
        variables.map((row) => [row.variableCode, String(rule.variableValues[row.variableCode])])
      )
      inputs.push(
        ...targets.value.map((row) => ({
          ...rule,
          variableValues,
          spaceId: row.context.house.spaceId,
          customerRelationshipIds: [...new Set(row.relationshipIds)],
          effectiveEndDate: rule.effectiveEndDate || null
        }))
      )
    }
    for (let i = 0; i < inputs.length; i++) {
      if (
        inputs
          .slice(i + 1)
          .some(
            (other) =>
              other.spaceId === inputs[i].spaceId &&
              other.projectSubjectId === inputs[i].projectSubjectId &&
              other.effectiveStartDate <= (inputs[i].effectiveEndDate || '9999-12-31') &&
              inputs[i].effectiveStartDate <= (other.effectiveEndDate || '9999-12-31')
          )
      ) {
        onlyMessage(t('Setting.overlappingRules'), 'warning')
        return
      }
    }
    submitInputs(inputs)
  }
  function addRule() {
    if (props.detail || (rules.value.length + 1) * Math.max(1, targets.value.length) > 200) return
    rules.value.push({
      ...defaults(),
      effectiveStartDate: model.effectiveStartDate,
      effectiveEndDate: model.effectiveEndDate
    })
  }

  onScopeDispose(() => {
    disposed = true
    ++token
  })
  return {
    form,
    model,
    rules,
    addRule,
    addHouses,
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
