import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { validateStandardFormula } from '../../api/financeStandard'
import { requestErrorMessage } from '../../utils/requestError'
/** 校验结果只属于当前表达式；输入变化或关闭后，不展示迟到的成功状态。 */
export function useFormulaValidation(project: () => string, expression: () => string, display: () => string) {
  const { t } = useI18n(),
    checking = ref(false),
    valid = ref(false)
  let generation = 0
  watch([expression, project], () => {
    generation++
    valid.value = false
    checking.value = false
  })
  onScopeDispose(() => {
    generation++
  })
  async function check() {
    if (!project() || !expression().trim() || checking.value) return
    const token = ++generation
    checking.value = true
    valid.value = false
    try {
      await validateStandardFormula(project(), { formulaExpression: expression(), formulaDisplay: display() })
      if (token === generation) {
        valid.value = true
        onlyMessage(t('Standard.formulaValid'), 'success')
      }
    } catch (cause) {
      if (token === generation) onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
    } finally {
      if (token === generation) checking.value = false
    }
  }
  return { checking, valid, check }
}
