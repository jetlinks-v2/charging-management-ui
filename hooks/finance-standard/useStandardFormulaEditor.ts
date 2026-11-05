import { computed, ref } from 'vue'
import type { FormulaVariable } from '../../api/financeStandard'
import { formulaDisplay } from './formula'
import { useFormulaValidation } from './useFormulaValidation'

/** 公式使用独立草稿；仅将校验通过且仍属于当前弹窗的表达式回填主表单。 */
export function useStandardFormulaEditor(
  props: { projectId: string; expression: string; variables: FormulaVariable[] },
  apply: (expression: string) => void
) {
  const open = ref(false),
    draft = ref('')
  const display = computed(() => formulaDisplay(draft.value, props.variables))
  const validation = useFormulaValidation(
    () => props.projectId,
    () => draft.value,
    () => display.value
  )
  let session = 0
  function begin() {
    session++
    draft.value = props.expression
    open.value = true
  }
  function cancel() {
    session++
    open.value = false
  }
  async function confirm() {
    const current = session
    if ((await validation.check()) && current === session && open.value) {
      apply(draft.value)
      open.value = false
    }
  }
  return { open, draft, display, ...validation, begin, cancel, confirm }
}
