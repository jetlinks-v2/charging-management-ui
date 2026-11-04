<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormulaVariable } from '../../../api/financeStandard'
import { useFormulaVariables } from '../../../hooks/finance-standard/useFormulaVariables'
import { standardPermission } from '../../../hooks/finance-standard/useStandardWorkspace'
const props = defineProps<{ open: boolean; projectId: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const { t } = useI18n()
const { rows, loading, saving, editorOpen, current, model, reload, edit, save, remove } = useFormulaVariables(
  props,
  () => emit('changed')
)
const columns = computed(() => [
  { title: t('Standard.variableName'), dataIndex: 'variableName', width: 180 },
  { title: t('Standard.variableCode'), dataIndex: 'variableCode', width: 220 },
  { title: t('Standard.variableScope'), dataIndex: 'scopeType', width: 90 },
  { title: t('Subject.enabled'), dataIndex: 'enabled', width: 80 },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 130 }
])
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="860"
    icon="FunctionOutlined"
    :title="t('Standard.variables')"
    @update:open="!saving && emit('close')"
  >
    <div class="standard-variable-toolbar">
      <a-button
        :loading="loading"
        @click="reload"
      >
        <AIcon type="ReloadOutlined" />
        {{ t('Finance.refresh') }}
      </a-button>
      <j-permission-button
        :hasPermission="`${standardPermission}:variable-save`"
        type="primary"
        @click="edit()"
      >
        {{ t('Standard.createVariable') }}
      </j-permission-button>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      :scroll="{ x: 700 }"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'scopeType'">{{ t('Standard.scope.' + record.scopeType) }}</template>
        <template v-else-if="column.dataIndex === 'enabled'">
          <a-tag :color="record.enabled ? 'success' : 'default'">
            {{ t(record.enabled ? 'Subject.active' : 'Subject.inactive') }}
          </a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'actions'">
          <a-space
            v-if="record.scopeType === 'PROJECT'"
            :size="0"
          >
            <j-permission-button
              :hasPermission="`${standardPermission}:variable-save`"
              type="link"
              size="small"
              @click="edit(record as FormulaVariable)"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: record.variableName })"
              @confirm="remove(record as FormulaVariable)"
            >
              <j-permission-button
                :hasPermission="`${standardPermission}:variable-delete`"
                type="link"
                size="small"
                danger
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
          <span v-else>{{ t('Standard.systemReadonly') }}</span>
        </template>
      </template>
      <template #emptyText><CloudEmpty :description="t('Standard.noVariables')" /></template>
    </a-table>
    <template #foot>
      <a-button
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t('Finance.close') }}
      </a-button>
    </template>
  </JlDrawerShell>
  <a-modal
    :open="editorOpen"
    :title="t(current ? 'Standard.editVariable' : 'Standard.createVariable')"
    :confirm-loading="saving"
    :mask-closable="!saving"
    @cancel="!saving && (editorOpen = false)"
    @ok="save"
  >
    <a-form layout="vertical">
      <a-form-item
        :label="t('Standard.variableName')"
        required
      >
        <a-input
          v-model:value="model.variableName"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item
        :label="t('Standard.variableCode')"
        required
        :extra="t('Standard.variableCodeHint')"
      >
        <a-input
          v-model:value="model.variableCode"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item :label="t('Standard.variableDescription')">
        <a-textarea
          v-model:value="model.description"
          :rows="2"
          :maxlength="300"
        />
      </a-form-item>
      <div class="finance-form-grid">
        <a-form-item :label="t('Subject.sortIndex')">
          <a-input-number
            v-model:value="model.sort"
            :precision="0"
            :min="0"
          />
        </a-form-item>
        <a-form-item :label="t('Subject.enabled')"><a-switch v-model:checked="model.enabled" /></a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>
<style src="../finance.css"></style>
<style scoped>
.standard-variable-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 18px;
}
</style>
