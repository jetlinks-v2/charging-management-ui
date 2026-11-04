import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  addRelationship,
  getHouse,
  getSpaceTree,
  type Customer,
  type RelationInput,
  type Relationship,
  type Scope,
  type Space
} from '../../api/archive'
import { relationshipPayload } from '../../utils/customer'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

/** 为已有主档新增房屋关系；不恢复旧关系，不修改客户资料或历史家庭。 */
export function useCustomerLink(scope: Scope, customer: Customer, done: (value: Relationship) => void) {
  useProjectSwitchGuard(() => false)
  const { t } = useI18n()
  const spaces = ref<Space[]>([])
  const loading = ref(false)
  const failed = ref(false)
  const houseLoading = ref(false)
  const ready = ref(false)
  const saving = ref(false)
  const relation = reactive<RelationInput>({ spaceId: '', startTime: Date.now(), familyMode: 'new' })
  const relationScope = computed<Scope>(() => ({ projectId: scope.projectId, spaceId: relation.spaceId }))
  let generation = 0
  let disposed = false

  async function selectSpace(value: unknown) {
    if (saving.value) return
    const spaceId = typeof value === 'string' ? value : ''
    const token = ++generation
    ready.value = false
    houseLoading.value = false
    // 家庭属于房屋；换房后必须重新选择，不能提交上一套房屋的家庭。
    Object.assign(relation, { spaceId, familyMode: 'new', familyId: undefined, familyName: undefined })
    if (!spaces.value.some((item) => item.id === spaceId)) return
    houseLoading.value = true
    try {
      const house = await getHouse({ projectId: scope.projectId }, spaceId)
      if (disposed || token !== generation) return
      ready.value = house.completed
      if (!house.completed) onlyMessage(t('Archive.completeFirst'), 'warning')
    } catch (cause) {
      if (!disposed && token === generation) {
        onlyMessage(requestErrorMessage(cause, t('Archive.houseFailed')), 'error')
      }
    } finally {
      if (!disposed && token === generation) houseLoading.value = false
    }
  }

  async function load() {
    if (loading.value) return
    loading.value = true
    failed.value = false
    try {
      const tree = await getSpaceTree(scope.projectId)
      if (disposed) return
      const active = new Set(customer.relationships.map((item) => item.spaceId))
      const leaves: Space[] = []
      const visit = (nodes: Space[]) =>
        nodes.forEach((item) => {
          // 仅使用后端明确标记的末端，不以可见 children 是否为空推断房屋。
          if (item.leaf && !active.has(item.id)) leaves.push(item)
          if (item.children) visit(item.children)
        })
      visit(tree)
      spaces.value = leaves
      if (scope.spaceId && leaves.some((item) => item.id === scope.spaceId)) {
        await selectSpace(scope.spaceId)
      }
    } catch (cause) {
      if (!disposed) {
        failed.value = true
        onlyMessage(requestErrorMessage(cause, t('Archive.loadFailed')), 'error')
      }
    } finally {
      if (!disposed) loading.value = false
    }
  }

  async function save() {
    if (saving.value || houseLoading.value || loading.value) return
    if (!ready.value || !spaces.value.some((item) => item.id === relation.spaceId)) {
      onlyMessage(t('Archive.completeFirst'), 'error')
      return
    }
    saving.value = true
    try {
      const value = await addRelationship(
        relationScope.value,
        customer.id,
        relationshipPayload(relation, customer.customerType)
      )
      if (!disposed) {
        onlyMessage(t('Archive.relationshipSaved'), 'success')
        done(value)
      }
    } catch (cause) {
      if (!disposed) onlyMessage(requestErrorMessage(cause, t('Archive.saveFailed')), 'error')
    } finally {
      if (!disposed) saving.value = false
    }
  }

  onMounted(() => {
    void load()
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return { spaces, loading, failed, houseLoading, ready, saving, relation, relationScope, selectSpace, load, save }
}
