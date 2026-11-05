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
    <div class="setting-picker-content">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Setting.searchHouse')"
        :aria-label="t('Setting.searchHouse')"
        allow-clear
        @search="load(0)"
      />
      <a-spin :spinning="loading || busy">
        <div class="setting-picker-results">
          <a-table
            v-if="multiple"
            class="setting-house-picker"
            row-key="spaceId"
            :columns="columns"
            :data-source="rows"
            :pagination="false"
            :row-selection="selection"
            :scroll="{ x: 480 }"
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
              <span class="setting-house-icon"><AIcon type="HomeOutlined" /></span>
              <span class="setting-house-label">
                <strong>{{ row.fullName }}</strong>
                <small>{{ t('Setting.billingArea') }} {{ row.billingArea }} m²</small>
              </span>
              <AIcon
                type="RightOutlined"
                class="setting-house-arrow"
              />
            </button>
            <CloudEmpty
              v-if="!loading && !rows.length"
              :description="t('Setting.noHouses')"
            />
          </div>
        </div>
      </a-spin>
      <div
        v-if="multiple || total > 0"
        class="setting-picker-footer"
      >
        <span
          v-if="multiple"
          class="setting-selection-summary"
        >
          {{ t('Setting.selectedHouses', { count: selected.length }) }}
        </span>
        <a-pagination
          v-if="total"
          class="setting-picker-pagination"
          :current="pageIndex + 1"
          :total="total"
          :page-size="8"
          size="small"
          :show-size-changer="false"
          @change="load($event - 1)"
        />
      </div>
    </div>
  </a-modal>
</template>
<style scoped>
.setting-picker-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.setting-picker-results {
  min-height: 96px;
  max-height: min(440px, calc(100dvh - 300px));
  overflow: auto;
  overscroll-behavior: contain;
}
.setting-house-choice {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 76px;
  padding: 12px;
  border: 0;
  background: transparent;
  color: var(--ant-color-text, #262626);
  text-align: left;
  cursor: pointer;
}
.setting-house-choice + .setting-house-choice {
  border-top: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.setting-house-choice:hover:not(:disabled),
.setting-house-choice:focus-visible {
  background: var(--ant-color-primary-bg, #e6f4ff);
}
.setting-house-choice:focus-visible {
  outline: 2px solid var(--ant-color-primary, #1677ff);
  outline-offset: -2px;
}
.setting-house-choice:disabled {
  cursor: not-allowed;
}
.setting-house-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary-bg, #e6f4ff);
  font-size: 18px;
}
.setting-house-label {
  min-width: 0;
}
.setting-house-choice strong {
  display: block;
  font-weight: 500;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.setting-house-choice small {
  display: block;
  margin-top: 4px;
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.setting-house-arrow {
  color: var(--ant-color-text-tertiary, #8c8c8c);
  font-size: 12px;
}
.setting-picker-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.setting-selection-summary {
  flex: 1;
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
}
.setting-picker-pagination {
  margin-left: auto;
}
</style>
