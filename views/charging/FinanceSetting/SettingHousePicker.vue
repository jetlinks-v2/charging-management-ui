<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { type querySettingHouses, type HouseInfo } from '../../../api/financeSetting'
import { useSettingHousePicker } from '../../../hooks/finance-setting/useSettingHousePicker'
const props = defineProps<{
  projectId: string
  busy: boolean
  multiple?: boolean
  selectedIds?: string[]
  limit?: number
  request?: typeof querySettingHouses
}>()
const emit = defineEmits<{ close: []; pick: [string]; pickMany: [string[]] }>()
const { t } = useI18n()
const { keyword, pageIndex, total, rows, loading, selected, remaining, load, select } = useSettingHousePicker(props)
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName' },
  { title: t('Setting.billingArea'), dataIndex: 'billingArea', width: 130 }
])
const selection = computed(() => ({
  selectedRowKeys: selected.value,
  preserveSelectedRowKeys: true,
  onChange: select,
  getCheckboxProps: (row: HouseInfo) => ({
    disabled:
      props.busy ||
      props.selectedIds?.includes(row.spaceId) ||
      (!selected.value.includes(row.spaceId) && selected.value.length >= remaining.value)
  })
}))
</script>
<template>
  <a-modal
    :open="true"
    :width="720"
    :title="t('Setting.chooseHouse')"
    :footer="multiple ? undefined : null"
    :confirm-loading="busy"
    :ok-button-props="{ disabled: !selected.length || loading }"
    :ok-text="t('Setting.addSelectedHouses', { count: selected.length })"
    @ok="emit('pickMany', selected)"
    @cancel="emit('close')"
  >
    <a-input-search
      v-model:value="keyword"
      :placeholder="t('Setting.searchHouse')"
      allow-clear
      @search="load(0)"
    />
    <a-spin :spinning="loading || busy">
      <a-table
        v-if="multiple"
        class="setting-house-picker"
        row-key="spaceId"
        :columns="columns"
        :data-source="rows"
        :pagination="false"
        :row-selection="selection"
        size="middle"
      >
        <template #emptyText><CloudEmpty :description="t('Setting.noHouses')" /></template>
      </a-table>
      <div
        v-else
        class="setting-house-picker"
      >
        <button
          v-for="row in rows"
          :key="row.spaceId"
          type="button"
          class="setting-house-choice"
          :disabled="busy"
          @click="emit('pick', row.spaceId)"
        >
          <AIcon type="HomeOutlined" />
          <span>
            <strong>{{ row.fullName }}</strong>
            <small>{{ t('Setting.billingArea') }} {{ row.billingArea }} m²</small>
          </span>
          <AIcon type="RightOutlined" />
        </button>
        <CloudEmpty
          v-if="!loading && !rows.length"
          :description="t('Setting.noHouses')"
        />
      </div>
    </a-spin>
    <div
      v-if="multiple"
      class="setting-selection-summary"
    >
      {{ t('Setting.selectedHouses', { count: selected.length }) }}
    </div>
    <a-pagination
      v-if="total"
      :current="pageIndex + 1"
      :total="total"
      :page-size="8"
      size="small"
      :show-size-changer="false"
      @change="load($event - 1)"
    />
  </a-modal>
</template>
<style scoped>
.setting-house-picker {
  min-height: 220px;
  padding: 16px 0;
}
.setting-house-choice {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 8px;
  border: 0;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.setting-house-choice:hover,
.setting-house-choice:focus-visible {
  background: var(--ant-color-primary-bg, #e6f4ff);
}
.setting-house-choice span {
  flex: 1;
  min-width: 0;
}
.setting-house-choice strong {
  display: block;
  overflow-wrap: anywhere;
}
.setting-house-choice small {
  display: block;
  margin-top: 4px;
  color: var(--ant-color-text-secondary, #595959);
}
.setting-selection-summary {
  margin-bottom: 12px;
  color: var(--ant-color-text-secondary, #595959);
}
</style>
