import { watch, onScopeDispose, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProjectCompany, createProjectCompany, saveCompany, type ProjectCompany } from '../../api/finance'
import { useProjectContext } from '../project/useProjectContext'
import { useCompanyCatalog } from './useCompanyCatalog'

/** 列表使用关联ID，编辑提交必须使用共享公司ID，避免把编辑误提交成新建。 */
export function useProjectCompanyEditor(
  projectId: Ref<string>,
  rows: Ref<ProjectCompany[]>,
  reload: () => Promise<void>
) {
  const { t } = useI18n()
  const editor = useCompanyCatalog(
    (id) => getProjectCompany(projectId.value, id),
    async (relationId, input) => {
      if (relationId) {
        const row = rows.value.find((item) => item.relation.id === relationId)
        if (!row) throw new Error(t('Finance.detailFailed'))
        const result = await saveCompany(row.company.id, input)
        await reload()
        return result
      }
      const result = await createProjectCompany(projectId.value, input)
      await reload()
      return { company: result.company, banks: input.banks }
    }
  )
  watch(projectId, editor.close)
  const release = useProjectContext().guard(() => !editor.open.value || editor.readOnly.value)
  onScopeDispose(release)
  return editor
}
