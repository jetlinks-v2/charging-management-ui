<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingTargetList, type SettingTargetListState } from '../../../hooks/finance-setting/useSettingTargetList'
const props = defineProps<{ state: SettingTargetListState }>()
const emit = defineEmits<{ choose: [] }>()
const { t } = useI18n()
const { pagination, pending, hasCustomers, selectAllCustomers, removeHouse } = useSettingTargetList(() => props.state)
const columns = computed(() => [
  { title: t('Setting.house'), key: 'house', width: 250 },
  { title: t('Setting.billingArea'), key: 'area', width: 110 },
  { title: t('Setting.customer'), key: 'customers', width: 320 },
  ...(props.state.batch ? [{ title: t('Finance.actions'), key: 'actions', width: 64 }] : [])
])
</script>
<template>
  <div class="setting-targets">
    <div class="target-toolbar">
      <div class="target-count">
        <strong>{{ t('Setting.targetCount', { count: state.targets.length }) }}</strong>
        <span
          v-if="pending"
          class="target-pending"
        >
          {{ t('Setting.pendingCustomers', { count: pending }) }}
        </span>
      </div>
      <a-space
        wrap
        :size="8"
      >
        <a-button
          v-if="state.batch"
          :disabled="state.busy || !hasCustomers"
          @click="selectAllCustomers"
        >
          {{ t('Setting.selectAllHouseCustomers') }}
        </a-button>
        <a-button
          v-if="state.canChoose"
          :loading="state.busy"
          @click="emit('choose')"
        >
          <AIcon type="PlusOutlined" />
          {{ t(state.targets.length && !state.batch ? 'Setting.changeHouse' : 'Setting.chooseHouse') }}
        </a-button>
      </a-space>
    </div>
    <a-table
      v-if="state.targets.length"
      :columns="columns"
      :data-source="state.targets"
      :row-key="(row) => row.context.house.spaceId"
      :pagination="pagination"
      size="small"
      table-layout="fixed"
      :scroll="{ x: state.batch ? 744 : 680 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'house'">
          <a-tooltip :title="record.context.house.fullName">
            <span class="target-house">{{ record.context.house.fullName }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'area'">
          <span class="target-area">{{ record.context.house.billingArea }} m²</span>
        </template>
        <template v-else-if="column.key === 'customers'">
          <a-select
            v-model:value="record.relationshipIds"
            mode="multiple"
            :max-tag-count="1"
            :max-tag-text-length="14"
            :disabled="state.busy || !record.context.customers.length"
            show-search
            option-filter-prop="label"
            :aria-label="record.context.house.fullName + ' ' + t('Setting.customer')"
            :placeholder="t(record.context.customers.length ? 'Setting.chooseCustomer' : 'Setting.noHouseCustomers')"
            :options="
              record.context.customers.map((row) => ({
                value: row.relationshipId,
                label: row.name + (row.telephone ? ' · ' + row.telephone : '')
              }))
            "
            class="target-customer"
          />
          <a-tooltip
            v-if="!record.context.customers.length"
            :title="t('Setting.noCustomers')"
          >
            <span class="target-pending">{{ t('Setting.noHouseCustomers') }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            type="text"
            :disabled="state.busy"
            :aria-label="t('Setting.removeHouse') + ' ' + record.context.house.fullName"
            @click="removeHouse(record.context.house.spaceId)"
          >
            <AIcon type="CloseOutlined" />
          </a-button>
        </template>
      </template>
      <template #emptyText><CloudEmpty :description="t('Setting.chooseHouse')" /></template>
    </a-table>
  </div>
</template>
<style scoped>
.target-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.target-count {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.target-count strong {
  font-weight: 500;
}
.target-pending {
  color: var(--ant-color-warning-text, #ad6800);
  font-size: 12px;
}
.target-house {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.target-area {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.target-customer {
  width: 100%;
}
.setting-targets :deep(.ant-table-cell) {
  padding: 10px 8px;
}
.setting-targets :deep(.ant-table-pagination) {
  margin-bottom: 0;
}
</style>
