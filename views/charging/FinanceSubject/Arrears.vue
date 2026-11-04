<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useArrears, arrearsPermission } from '../../../hooks/finance-subject/useArrears'
const { t } = useI18n()
const {
  table,
  terms,
  params,
  open,
  loading,
  failed,
  saving,
  readOnly,
  model,
  form,
  levels,
  reload,
  select,
  save,
  remove,
  close,
  request,
  notify
} = useArrears()
const columns = computed(() => [
  { title: t('Subject.arrearsName'), dataIndex: 'name', width: 260, scopedSlots: true },
  { title: t('Subject.remark'), dataIndex: 'remark' },
  { title: t('Finance.modified'), dataIndex: 'modifierName', width: 140 },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 180, scopedSlots: true }
])
const fields = computed(() => [{ title: t('Subject.arrearsName'), dataIndex: 'name', search: { type: 'string' } }])
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <j-page-container>
    <div class="finance-workspace">
      <div class="finance-toolbar">
        <a-button @click="reload">
          <AIcon type="ReloadOutlined" />
          {{ t('Finance.refresh') }}
        </a-button>
        <j-permission-button
          :hasPermission="`${arrearsPermission}:save`"
          type="primary"
          @click="select(undefined, false)"
        >
          {{ t('Subject.createArrears') }}
        </j-permission-button>
      </div>
      <ConditionFilter
        :columns="fields"
        @change="filter"
      />
      <j-pro-table
        ref="table"
        row-key="id"
        mode="TABLE"
        type="PAGE"
        :columns="columns"
        :params="params"
        :request="request"
        :no-pagination="false"
        :pagination="{ pageSize: 12 }"
        :alert-show="false"
        @request-error="notify"
      >
        <template #name="row">
          <a-button
            type="link"
            @click="select(row.id)"
          >
            {{ row.name }}
          </a-button>
        </template>
        <template #actions="row">
          <a-space :size="0">
            <a-button
              type="link"
              size="small"
              @click="select(row.id)"
            >
              {{ t('Finance.detail') }}
            </a-button>
            <j-permission-button
              :hasPermission="`${arrearsPermission}:save`"
              type="link"
              size="small"
              @click="select(row.id, false)"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: row.name })"
              @confirm="remove(row)"
            >
              <j-permission-button
                :hasPermission="`${arrearsPermission}:delete`"
                type="link"
                size="small"
                danger
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
        </template>
        <template #emptyText><CloudEmpty :description="t('Subject.noArrears')" /></template>
      </j-pro-table>
    </div>
    <JlDrawerShell
      :open="open"
      :width="680"
      icon="BellOutlined"
      :title="t(readOnly ? 'Finance.detail' : 'Subject.arrearsConfig')"
      :sub="model.name"
      @update:open="close"
    >
      <a-skeleton
        v-if="loading"
        active
      />
      <a-empty
        v-else-if="failed"
        :description="false"
      />
      <a-form
        v-else
        ref="form"
        :model="model"
        layout="vertical"
        :disabled="saving"
      >
        <a-form-item
          :label="t('Subject.arrearsName')"
          name="name"
          :rules="readOnly ? [] : [{ required: true, whitespace: true, message: t('Subject.required') }]"
        >
          <span v-if="readOnly">{{ model.name }}</span>
          <a-input
            v-else
            v-model:value="model.name"
            :maxlength="100"
          />
        </a-form-item>
        <a-alert
          v-if="!readOnly && !levels.length"
          type="warning"
          :message="t('Subject.configureLevels')"
          show-icon
        />
        <div class="arrears-rules-heading">
          <h3>{{ t('Subject.thresholds') }}</h3>
          <a-button
            v-if="!readOnly"
            size="small"
            :disabled="model.rules.length >= 100"
            @click="model.rules.push({ overdueDays: 1, levelCode: '' })"
          >
            <AIcon type="PlusOutlined" />
            {{ t('Subject.addRule') }}
          </a-button>
        </div>
        <div
          v-for="(rule, index) in model.rules"
          :key="index"
          class="arrears-rule"
        >
          <a-form-item
            :label="t('Subject.overdueDays')"
            :name="['rules', index, 'overdueDays']"
            :rules="readOnly ? [] : [{ required: true, type: 'number', min: 1, message: t('Subject.positiveDays') }]"
          >
            <span v-if="readOnly">{{ rule.overdueDays }}</span>
            <a-input-number
              v-else
              v-model:value="rule.overdueDays"
              :min="1"
              :precision="0"
            />
          </a-form-item>
          <a-form-item
            :label="t('Subject.level')"
            :name="['rules', index, 'levelCode']"
            :rules="readOnly ? [] : [{ required: true, message: t('Subject.required') }]"
          >
            <span v-if="readOnly">
              {{ levels.find((item) => item.value === rule.levelCode)?.text || rule.levelCode }}
            </span>
            <a-select
              v-else
              v-model:value="rule.levelCode"
              :options="levels.map((item) => ({ value: item.value, label: item.text }))"
            />
          </a-form-item>
          <a-button
            v-if="!readOnly"
            type="text"
            danger
            :disabled="model.rules.length === 1"
            @click="model.rules.splice(index, 1)"
          >
            <AIcon type="DeleteOutlined" />
          </a-button>
        </div>
        <a-form-item :label="t('Subject.remark')">
          <span v-if="readOnly">{{ model.remark || '—' }}</span>
          <a-textarea
            v-else
            v-model:value="model.remark"
            :maxlength="250"
            :rows="3"
          />
        </a-form-item>
      </a-form>
      <template #foot>
        <a-button
          :disabled="saving"
          @click="close"
        >
          {{ t('Finance.close') }}
        </a-button>
        <a-button
          v-if="!readOnly"
          type="primary"
          :loading="saving"
          :disabled="loading || failed || !levels.length"
          @click="save"
        >
          {{ t('Finance.save') }}
        </a-button>
      </template>
    </JlDrawerShell>
  </j-page-container>
</template>
<style src="../finance.css"></style>
<style scoped>
.arrears-rules-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 12px;
}
.arrears-rules-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.arrears-rule {
  display: grid;
  grid-template-columns: 160px minmax(120px, 1fr) 32px;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--line, #f0f0f0);
}
</style>
