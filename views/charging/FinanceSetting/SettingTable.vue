<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import dayjs from 'dayjs'
import type { ChargeSetting } from '../../../api/financeSetting'
import type { Query } from '../../../api/archive'
import { settingPermission, type useSettingWorkspace } from '../../../hooks/finance-setting/useSettingWorkspace'
const props = defineProps<{ state: ReturnType<typeof useSettingWorkspace> }>()
const { t } = useI18n()
const { archive, table, terms, params, request, select, remove, generate, stopTarget, notify } = props.state
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 220, scopedSlots: true },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 120 },
  { title: t('Setting.standard'), dataIndex: 'standardName', width: 180, scopedSlots: true },
  {
    title: t('Setting.price'),
    dataIndex: 'price',
    width: 120,
    align: 'right',
    className: 'setting-price-column',
    scopedSlots: true
  },
  { title: t('Setting.formula'), dataIndex: 'formula', width: 200, scopedSlots: true },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 160, scopedSlots: true },
  { title: t('Setting.validity'), dataIndex: 'validity', width: 200, scopedSlots: true },
  { title: t('SettingReview.state'), dataIndex: 'reviewState', width: 110, scopedSlots: true },
  { title: t('Setting.state'), dataIndex: 'status', width: 120, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 150, fixed: 'right', scopedSlots: true }
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
function periodState(row: ChargeSetting) {
  if (row.status !== 'ACTIVE') return row.status
  const today = dayjs().format('YYYY-MM-DD')
  if (row.effectiveStartDate > today) return 'PENDING'
  if (row.effectiveEndDate && row.effectiveEndDate < today) return 'EXPIRED'
  return 'ACTIVE'
}
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
    :scroll="{ x: 1580 }"
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
      <small class="setting-secondary">{{ row.standardCode }} · V{{ row.configVersion }}</small>
    </template>
    <template #price="row">
      <span class="setting-price">{{ row.snapshot?.standard?.price ?? '—' }}</span>
    </template>
    <template #formula="row">
      <a-tooltip :title="row.snapshot?.standard?.formulaDisplay">
        <span class="setting-formula-text">{{ row.snapshot?.standard?.formulaDisplay || '—' }}</span>
      </a-tooltip>
    </template>
    <template #customerName="row">{{ row.customerNames?.join('、') || row.customerName }}</template>
    <template #validity="row">
      {{ row.effectiveStartDate }} ～ {{ row.effectiveEndDate || t('Setting.unlimited') }}
    </template>
    <template #reviewState="row">
      <a-tag
        :color="row.reviewState === 'APPROVED' ? 'success' : row.reviewState === 'REJECTED' ? 'error' : 'processing'"
      >
        {{ t('SettingReview.states.' + row.reviewState) }}
      </a-tag>
    </template>
    <template #status="row">
      <a-tag :color="periodState(row) === 'ACTIVE' ? 'success' : 'default'">
        {{ t('Setting.status.' + periodState(row)) }}
      </a-tag>
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
                v-if="row.status === 'ACTIVE' && row.reviewState === 'APPROVED'"
                key="customer"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:change-customer`"
                  type="text"
                  @click="select(row, false, 'customer')"
                >
                  {{ t('Setting.changeCustomer') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="row.status === 'ACTIVE' && row.reviewState === 'APPROVED'"
                key="next"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:next-version`"
                  type="text"
                  @click="select(row, false, 'next')"
                >
                  {{ t('Setting.nextVersion') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="row.status === 'ACTIVE' && row.reviewState === 'APPROVED'"
                key="stop"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:stop`"
                  type="text"
                  @click="stopTarget = row"
                >
                  {{ t('Setting.stop') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="row.reviewState === 'APPROVED'"
                key="generate"
              >
                <j-permission-button
                  :hasPermission="`${settingPermission}:calculate`"
                  type="text"
                  @click="generate(row)"
                >
                  {{ t('Setting.calculate') }}
                </j-permission-button>
              </a-menu-item>
              <a-menu-item
                v-if="!row.billed && row.reviewState !== 'APPROVED'"
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
.setting-price {
  font-variant-numeric: tabular-nums;
}
:deep(th.setting-price-column) {
  white-space: nowrap;
}
.setting-formula-text {
  display: block;
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
