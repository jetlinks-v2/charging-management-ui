import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryReceivableLogs, type Receivable, type ReceivableLog } from '../../api/financeReceivable'
import { requestErrorMessage } from '../../utils/requestError'

/** 抽屉绑定原项目与账单；分页迟到响应不能覆盖新详情。 */
export function useReceivableLogs(props: { projectId: string; detail?: Receivable }) {
  const { t } = useI18n()
  const rows = ref<ReceivableLog[]>([]),
    total = ref(0),
    current = ref(1),
    loading = ref(false),
    failed = ref(false)
  let token = 0
  async function load(page = 1) {
    const project = props.projectId,
      key = props.detail?.id,
      attempt = ++token
    rows.value = []
    total.value = 0
    current.value = page
    failed.value = false
    loading.value = false
    if (!project || !key) return
    loading.value = true
    try {
      const response = await queryReceivableLogs(project, key, {
        pageIndex: page - 1,
        pageSize: 5,
        terms: [],
        sorts: [{ name: 'createTime', order: 'desc' }]
      })
      if (attempt === token) {
        rows.value = response.result.data
        total.value = response.result.total
      }
    } catch (error) {
      if (attempt === token) {
        failed.value = true
        onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
      }
    } finally {
      if (attempt === token) loading.value = false
    }
  }
  watch(
    () => [props.projectId, props.detail?.id],
    () => void load(),
    { immediate: true }
  )
  onScopeDispose(() => {
    ++token
  })
  return { rows, total, current, loading, failed, load }
}
