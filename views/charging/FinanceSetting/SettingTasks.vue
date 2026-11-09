<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBillingTasks } from '../../../hooks/finance-setting/useBillingTasks'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { table, status, params, notify, reload, request } = useBillingTasks(props.projectId)
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 230 },
  { title: t('Setting.taskKind'), dataIndex: 'kind', width: 110, scopedSlots: true },
  { title: t('Setting.businessDate'), dataIndex: 'businessDate', width: 120 },
  { title: t('Setting.state'), dataIndex: 'status', width: 110, scopedSlots: true },
  { title: t('Setting.taskResult'), dataIndex: 'result', width: 220, scopedSlots: true },
  { title: t('Setting.attempts'), dataIndex: 'attempts', width: 85 }
])
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1120"
    icon="ScheduleOutlined"
    :title="t('Setting.tasks')"
    @update:open="emit('close')"
  >
    <div class="setting-tasks-toolbar">
      <a-select
        v-model:value="status"
        :aria-label="t('Setting.state')"
        class="setting-task-filter"
        :options="[
          { value: '', label: t('Setting.allTasks') },
          ...['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED'].map((value) => ({
            value,
            label: t('Setting.taskStatus.' + value)
          }))
        ]"
      />
      <a-button @click="reload">
        <AIcon type="ReloadOutlined" />
        {{ t('Finance.refresh') }}
      </a-button>
    </div>
    <j-pro-table
      ref="table"
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :params="params"
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      :scroll="{ x: 1050 }"
      @request-error="notify"
    >
      <template #kind="row">{{ t('Setting.taskKindValue.' + row.kind) }}</template>
      <template #status="row">
        <a-tag
          :color="
            row.status === 'FAILED'
              ? 'error'
              : row.status === 'SUCCEEDED'
                ? 'success'
                : row.status === 'RUNNING'
                  ? 'processing'
                  : 'default'
          "
        >
          {{ t('Setting.taskStatus.' + row.status) }}
        </a-tag>
      </template>
      <template #result="row">
        <span v-if="row.status === 'FAILED'">{{ row.errorMessage || t('Finance.failed') }}</span>
        <span v-else-if="row.status === 'SUCCEEDED'">
          {{ t('Setting.generated', { generated: row.generated || 0, retained: row.retained || 0 }) }}
        </span>
        <span v-else>—</span>
      </template>
      <template #emptyText><CloudEmpty :description="t('Setting.noTasks')" /></template>
    </j-pro-table>
    <template #foot>
      <a-button @click="emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.setting-tasks-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.setting-task-filter {
  width: 180px;
}
</style>
