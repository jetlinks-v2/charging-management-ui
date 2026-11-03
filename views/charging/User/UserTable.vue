<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { accountState } from '../../../utils/userQuery'
import type { UserQuery } from '../../../api/user'
import type { useUserList } from '../../../hooks/useUserList'
import { userPermission } from '../../../hooks/useUserDetail'
import UserIdentityTags from './UserIdentityTags.vue'
defineProps<{
  params: UserQuery
  request: ReturnType<typeof useUserList>['request']
  state: { failed: boolean; hasSynced: boolean; canReset: boolean }
}>()
const emit = defineEmits<{ select: [string]; mark: [string]; reset: [] }>()
const { t } = useI18n()
const k = 'UserManagement.'
const table = ref<{ reload: () => void }>()
defineExpose({ reload: () => table.value?.reload() })
const columns = computed(() => [
  { title: t(k + 'user'), key: 'user', dataIndex: 'user', scopedSlots: true, width: 240 },
  { title: t(k + 'telephone'), dataIndex: 'telephone', width: 150, columnEmpty: t(k + 'notProvided') },
  { title: t(k + 'organization'), dataIndex: 'organization', scopedSlots: true, width: 280 },
  { title: t(k + 'identity'), dataIndex: 'identities', scopedSlots: true, width: 165 },
  { title: t(k + 'status'), dataIndex: 'status', scopedSlots: true, width: 110 },
  { title: t(k + 'actions'), dataIndex: 'actions', scopedSlots: true, width: 160, fixed: 'right' }
])
</script>
<template>
  <j-pro-table
    ref="table"
    class="user-table"
    row-key="id"
    mode="TABLE"
    type="PAGE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: 1105 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
  >
    <template #user="record">
      <button
        class="user-name-button"
        type="button"
        @click="emit('select', record.id)"
      >
        <a-avatar
          :size="36"
          class="user-avatar"
        >
          {{ (record.name || record.username).slice(0, 1) }}
        </a-avatar>
        <span class="user-name-copy">
          <b>{{ record.name || record.username }}</b>
          <span>{{ record.username }}</span>
        </span>
      </button>
    </template>
    <template #organization="record">
      <div
        v-for="org in record.orgList"
        :key="org.orgId"
        class="user-org-cell"
        :title="org.fullName"
      >
        <span>{{ org.name || org.orgId }}</span>
        <small>{{ org.fullName || org.name || org.orgId }}</small>
      </div>
      <span
        v-if="!record.orgList.length"
        class="user-muted"
      >
        {{ t(k + 'noOrganization') }}
      </span>
    </template>
    <template #identities="record"><UserIdentityTags :identities="record.identities" /></template>
    <template #status="record">
      <j-badge-status
        :status="record.status"
        :text="t(k + accountState(record.status))"
        :status-names="{ 1: 'success', 0: 'default' }"
      />
    </template>
    <template #actions="record">
      <div class="user-row-actions">
        <a-button
          type="link"
          size="small"
          @click="emit('select', record.id)"
        >
          {{ t(k + 'detail') }}
        </a-button>
        <j-permission-button
          :hasPermission="`${userPermission}:save`"
          type="link"
          size="small"
          :disabled="record.status !== 1"
          @click="emit('mark', record.id)"
        >
          {{ t(k + 'mark') }}
        </j-permission-button>
      </div>
    </template>
    <template #emptyText>
      <CloudEmpty
        :description="
          t(k + (state.failed ? 'loadFailed' : !state.hasSynced ? 'notSynced' : state.canReset ? 'noMatches' : 'empty'))
        "
      >
        <a-button
          v-if="state.canReset"
          @click="emit('reset')"
        >
          {{ t(k + 'resetFilters') }}
        </a-button>
      </CloudEmpty>
    </template>
  </j-pro-table>
</template>
<style scoped src="./table.css"></style>
