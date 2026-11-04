import { computed, onScopeDispose, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import {
  queryAllocationRecipients,
  type AllocationBook,
  type AllocationInput,
  type AllocationRecipient
} from '../../api/financeAllocation'
/** 只加载当前搜索的领用账号页；已保存账号以冻结名称回显，迟到搜索不串页。 */
export function useAllocationEditor(project: string, detail: AllocationBook | undefined, notify: (e: unknown) => void) {
  const model = reactive<AllocationInput>({
    buyDate: detail?.buyDate || dayjs().format('YYYY-MM-DD'),
    recipientId: detail?.recipientId || '',
    billType: detail?.billType || '',
    billCode: detail?.billCode || '',
    billSource: detail?.billSource,
    quota: detail?.quota,
    bookCount: 1,
    numberCount: detail?.numberCount || 50,
    startNumber: detail?.startNumber || 1,
    enabled: detail?.enabled ?? true,
    recovered: detail?.recovered ?? false,
    remark: detail?.remark
  })
  const recipients = ref<AllocationRecipient[]>(
      detail ? [{ id: detail.recipientId, name: detail.recipientName, username: detail.recipientUsername }] : []
    ),
    loading = ref(false),
    more = ref(false)
  let generation = 0,
    page = 0,
    keywords = '',
    disposed = false
  async function search(value = '', append = false) {
    const token = ++generation,
      next = append ? page + 1 : 0
    keywords = value
    loading.value = true
    try {
      const result = await queryAllocationRecipients(project, next, value)
      if (disposed || token !== generation) return
      page = next
      const selected = recipients.value.find((user) => user.id === model.recipientId)
      const values = append ? [...recipients.value, ...result.data] : result.data
      recipients.value = selected && !values.some((user) => user.id === selected.id) ? [selected, ...values] : values
      more.value = (next + 1) * 20 < result.total
    } catch (e) {
      if (!disposed && token === generation) notify(e)
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  const endNumber = computed(() =>
    Number.isSafeInteger(model.startNumber) &&
    Number.isSafeInteger(model.numberCount) &&
    Number.isSafeInteger(model.bookCount)
      ? model.startNumber + model.numberCount * model.bookCount - 1
      : undefined
  )
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { model, recipients, loading, more, endNumber, search, loadMore: () => search(keywords, true) }
}
