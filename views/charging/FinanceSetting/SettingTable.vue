<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { settingPermission, type useSettingWorkspace } from '../../../hooks/finance-setting/useSettingWorkspace'
const props = defineProps<{ state: ReturnType<typeof useSettingWorkspace> }>()
const { t } = useI18n()
const { archive, table, terms, params, request, select, remove, generate, stopTarget, notify } = props.state
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240, scopedSlots: true },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 140 },
  { title: t('Setting.standard'), dataIndex: 'standardName', width: 190, scopedSlots: true },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 180, scopedSlots: true },
  { title: t('Setting.validity'), dataIndex: 'validity', width: 210, scopedSlots: true },
  { title: t('Setting.version'), dataIndex: 'configVersion', width: 80 },
  { title: t('Setting.state'), dataIndex: 'status', width: 130, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 160, fixed: 'right', scopedSlots: true }
])
const fields = computed(() =>
  ['fullName', 'subjectName', 'standardName', 'customerName'].map((key) => ({
    title: t(
      'Setting.' +
        { fullName: 'house', subjectName: 'subject', standardName: 'standard', customerName: 'customer' }[key]
    ),
    dataIndex: key,
    search: { type: 'string' }
  }))
)
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <ConditionFilter
    :columns="fields"
    @change="filter"
  />
  <j-pro-table
    v-if="archive.projectId.value"
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
    :scroll="{ x: 1200 }"
    @request-error="notify"
  >
    <template #fullName="row">
      <a-button
        type="link"
        class="setting-house-link"
        @click="select(row)"
      >
        {{ row.fullName }}
      </a-button>
    </template>
    <template #standardName="row">
      <span>{{ row.standardName }}</span>
      <small class="setting-secondary">{{ row.standardCode }}</small>
    </template>
    <template #customerName="row">{{ row.customerNames?.join('、') || row.customerName }}</template>
    <template #validity="row">
      {{ row.effectiveStartDate }} ～ {{ row.effectiveEndDate || t('Setting.unlimited') }}
    </template>
    <template #status="row">
      <a-tag :color="row.status === 'ACTIVE' ? 'success' : 'default'">{{ t('Setting.status.' + row.status) }}</a-tag>
      <small class="setting-secondary">{{ t(row.billed ? 'Setting.billed' : 'Setting.unbilled') }}</small>
    </template>
    <template #actions="row">
      <a-space :size="0">
        <a-button
          type="link"
          size="small"
          @click="select(row)"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <j-permission-button
          v-if="!row.billed"
          :hasPermission="`${settingPermission}:save`"
          type="link"
          size="small"
          @click="select(row, false)"
        >
          {{ t('Finance.edit') }}
        </j-permission-button>
        <a-dropdown :trigger="['click']">
          <a-button
            type="text"
            size="small"
            :aria-label="t('Setting.more')"
          >
            <AIcon type="MoreOutlined" />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item
                v-if="row.status === 'ACTIVE'"
                key="next"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:save`"
                  type="text"
                  @click="select(row, false, 'next')"
                >
                  {{ t('Setting.nextVersion') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="row.status === 'ACTIVE'"
                key="stop"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:save`"
                  type="text"
                  @click="stopTarget = row"
                >
                  {{ t('Setting.stop') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item key="generate">
                <j-permission-button
                  :hasPermission="`${settingPermission}:calculate`"
                  type="text"
                  @click="generate(row)"
                >
                  {{ t('Setting.calculate') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="!row.billed"
                key="delete"
              >
                <a-popconfirm
                  :title="t('Setting.deleteConfirm')"
                  @confirm="remove(row)"
                >
                  <j-permission-button
                    :hasPermission="`${settingPermission}:delete`"
                    type="text"
                    danger
                  >
                    {{ t('Finance.delete') }}
                  </j-permission-button>
                </a-popconfirm>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </template>
    <template #emptyText><CloudEmpty :description="t('Setting.empty')" /></template>
  </j-pro-table>
</template>
<style scoped>
.setting-house-link {
  padding: 0;
  max-width: 100%;
  height: auto;
  white-space: normal;
  text-align: left;
}
.setting-secondary {
  display: block;
  color: var(--ant-color-text-secondary, #595959);
  margin-top: 4px;
}
</style>
