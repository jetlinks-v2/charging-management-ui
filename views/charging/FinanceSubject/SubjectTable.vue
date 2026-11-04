<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { Subject, ProjectSubject } from '../../../api/financeSubject'
import {
  subjectPermission,
  projectSubjectPermission,
  type useSubjectCatalog
} from '../../../hooks/finance-subject/useSubjectCatalog'
const props = defineProps<{ state: ReturnType<typeof useSubjectCatalog>; projectMode?: boolean }>()
const { t } = useI18n()
const {
  table,
  terms,
  params,
  feeTypes,
  selectedKeys,
  selectedRows,
  projectId,
  request,
  select,
  remove,
  startIssue,
  notify
} = props.state
const permission = computed(() => (props.projectMode ? projectSubjectPermission : subjectPermission))
const columns = computed(() => [
  { title: t('Subject.enabled'), dataIndex: 'enabled', width: 100, scopedSlots: true },
  { title: t('Subject.name'), dataIndex: 'name', width: 230, scopedSlots: true },
  { title: t('Subject.code'), dataIndex: 'code', width: 210, scopedSlots: true },
  { title: t('Subject.feeType'), dataIndex: 'feeType', width: 160, scopedSlots: true },
  {
    title: t('Finance.actions'),
    dataIndex: 'actions',
    width: props.projectMode ? 150 : 230,
    fixed: 'right',
    scopedSlots: true
  }
])
const fields = computed(() =>
  ['name', 'code'].map((key) => ({ title: t('Subject.' + key), dataIndex: key, search: { type: 'string' } }))
)
const subject = (row: Subject | ProjectSubject) => ('subject' in row ? row.subject : row)
const rowId = (row: Subject | ProjectSubject) => ('subject' in row ? row.relation.id : row.id)
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
const selection = computed(() =>
  props.projectMode
    ? undefined
    : {
        selectedRowKeys: selectedKeys.value,
        onChange: (keys: string[], rows: Subject[]) => {
          selectedKeys.value = keys
          selectedRows.value = rows
        }
      }
)
</script>
<template>
  <ConditionFilter
    :columns="fields"
    @change="filter"
  />
  <CloudEmpty
    v-if="projectMode && !projectId"
    :description="t('ProjectContext.choose')"
  />
  <j-pro-table
    v-else
    ref="table"
    :row-key="rowId"
    mode="TABLE"
    type="PAGE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: 900 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :row-selection="selection"
    @request-error="notify"
  >
    <template #enabled="row">
      <a-tag :color="subject(row).enabled ? 'success' : 'default'">
        {{ t(subject(row).enabled ? 'Subject.active' : 'Subject.inactive') }}
      </a-tag>
    </template>
    <template #name="row">
      <a-button
        type="link"
        @click="select(rowId(row))"
      >
        {{ subject(row).name }}
      </a-button>
    </template>
    <template #code="row">
      <span class="subject-code">{{ subject(row).code }}</span>
    </template>
    <template #feeType="row">
      {{ feeTypes.find((item) => item.value === subject(row).feeType)?.text || subject(row).feeType }}
    </template>
    <template #actions="row">
      <a-space :size="0">
        <a-button
          type="link"
          size="small"
          @click="select(rowId(row))"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <j-permission-button
          v-if="!projectMode"
          :hasPermission="`${permission}:save`"
          type="link"
          size="small"
          @click="select(rowId(row), false)"
        >
          {{ t('Finance.edit') }}
        </j-permission-button>
        <j-permission-button
          v-if="!projectMode"
          :hasPermission="`${permission}:issue`"
          type="link"
          size="small"
          @click="startIssue([rowId(row)])"
        >
          {{ t('Subject.issue') }}
        </j-permission-button>
        <a-popconfirm
          :title="t('Finance.deleteConfirm', { name: subject(row).name })"
          @confirm="remove(row)"
        >
          <j-permission-button
            :hasPermission="`${permission}:delete`"
            type="link"
            size="small"
            danger
          >
            {{ t('Finance.delete') }}
          </j-permission-button>
        </a-popconfirm>
      </a-space>
    </template>
    <template #emptyText>
      <CloudEmpty :description="t(projectMode ? 'Subject.noProjectSubjects' : 'Subject.noSubjects')" />
    </template>
  </j-pro-table>
</template>
<style scoped>
.subject-code {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
</style>
