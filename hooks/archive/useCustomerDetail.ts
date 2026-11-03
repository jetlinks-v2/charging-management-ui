import { onScopeDispose, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  deleteCustomer,
  deleteRelationship,
  endRelationship,
  getCustomer,
  saveCustomer,
  type Customer,
  type CustomerProfile,
  type Relationship,
  type Scope
} from '../../api/archive'
import { profilePayload } from '../../utils/customer'
import { requestErrorMessage } from '../../utils/requestError'
export function useCustomerDetail(scope: Scope, reload: () => void) {
  const { t } = useI18n()
  const open = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const busy = ref(false)
  const editing = ref(false)
  const linking = ref(false)
  const customer = ref<Customer>()
  const history = ref<Relationship>()
  const selectedId = ref('')
  const ending = ref<Relationship>()
  const endTime = ref<number>(Date.now())
  const endReason = ref('')
  const profile = reactive<CustomerProfile>({ name: '', telephone: '' })
  let generation = 0
  let disposed = false
  async function select(id: string, historical?: Relationship, mode: 'view' | 'edit' = 'view') {
    const token = ++generation
    selectedId.value = id
    open.value = true
    editing.value = false
    linking.value = false
    failed.value = false
    customer.value = undefined
    history.value = historical
    ending.value = undefined
    // 历史响应已含权限范围内的主档；已删除主档不能通过当前客户详情重新读取。
    if (historical?.customer) {
      customer.value = historical.customer
      return
    }
    loading.value = true
    try {
      const result = await getCustomer(scope, id)
      if (!disposed && token === generation) {
        customer.value = result
        // 列表编辑必须等待最新主档和版本；旧请求、历史详情不能打开编辑状态。
        if (mode === 'edit' && !historical) edit()
      }
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  function close() {
    generation++
    open.value = false
    editing.value = false
    linking.value = false
    history.value = undefined
    customer.value = undefined
    ending.value = undefined
  }
  function edit() {
    if (!customer.value || history.value || customer.value.deleted) return
    Object.assign(profile, profilePayload(customer.value, customer.value.customerType))
    editing.value = true
  }
  async function mutate(action: () => Promise<unknown>, after: () => void | Promise<void>) {
    if (busy.value) return
    const token = generation
    busy.value = true
    try {
      await action()
      if (disposed || token !== generation) return
      reload()
      await after()
      onlyMessage(t('Archive.customerSaved'), 'success')
    } catch (cause) {
      if (!disposed && token === generation) {
        onlyMessage(requestErrorMessage(cause, t('Archive.saveFailed')), 'error')
      }
    } finally {
      if (!disposed) busy.value = false
    }
  }
  function save() {
    const current = customer.value
    if (!current || !editing.value || history.value) return
    return mutate(
      () =>
        saveCustomer(scope, current.id, { ...profilePayload(profile, current.customerType), version: current.version }),
      close
    )
  }
  function removeRelation(relation: Relationship) {
    const current = customer.value
    if (!current || !editing.value || history.value) return
    return mutate(
      () => deleteRelationship(scope, relation),
      () => select(current.id, undefined, 'edit')
    )
  }
  function beginEnd(relation: Relationship) {
    // 详情只读；仅列表进入的编辑模式允许处理房屋关联。
    if (!editing.value || history.value || busy.value) return
    ending.value = relation
    endTime.value = Date.now()
    endReason.value = ''
  }
  function beginLink() {
    if (!editing.value || history.value || busy.value || !customer.value || customer.value.deleted) return
    linking.value = true
  }
  function linked(relation: Relationship) {
    const current = customer.value
    if (
      !current ||
      !editing.value ||
      history.value ||
      relation.customerId !== current.id ||
      relation.projectId !== scope.projectId
    )
      return
    // 只合并新关联，避免刷新整个编辑表单丢失尚未保存的客户资料。
    customer.value = {
      ...current,
      relationships: [...current.relationships.filter((item) => item.id !== relation.id), relation]
    }
    linking.value = false
    reload()
  }
  function end() {
    const relation = ending.value
    const current = customer.value
    if (!relation || !current || !editing.value || history.value) return
    if (!endTime.value || endTime.value < relation.startTime || !endReason.value.trim()) {
      onlyMessage(t('Archive.endInvalid'), 'error')
      return
    }
    return mutate(
      () => endRelationship(scope, relation, Number(endTime.value), endReason.value.trim()),
      () => select(current.id, undefined, 'edit')
    )
  }
  function removeCustomer(current: Customer) {
    // 删除主档与结束房屋关联是两个动作，历史详情只读，有有效关联时禁止删主档。
    if (history.value || current.relationships.length || current.deleted) return
    return mutate(
      () => deleteCustomer(scope, current),
      () => {
        if (customer.value?.id === current.id) close()
      }
    )
  }
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    scope,
    open,
    loading,
    failed,
    busy,
    editing,
    linking,
    customer,
    history,
    selectedId,
    ending,
    endTime,
    endReason,
    profile,
    select,
    close,
    edit,
    save,
    removeRelation,
    beginEnd,
    beginLink,
    linked,
    end,
    removeCustomer
  }
}
