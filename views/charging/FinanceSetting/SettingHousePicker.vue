<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { querySettingHouses, type HouseInfo } from '../../../api/financeSetting'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; busy: boolean; request?: typeof querySettingHouses }>()
const emit = defineEmits<{ close: []; pick: [string] }>()
const { t } = useI18n()
const keyword = ref(''),
  pageIndex = ref(0),
  total = ref(0),
  rows = ref<HouseInfo[]>([]),
  loading = ref(false)
let token = 0
async function load(page = 0) {
  const generation = ++token
  pageIndex.value = page
  loading.value = true
  try {
    const result = await (props.request || querySettingHouses)(props.projectId, {
      keyword: keyword.value,
      pageIndex: page,
      pageSize: 8
    })
    if (generation === token) {
      rows.value = result.data
      total.value = result.total
    }
  } catch (error) {
    if (generation === token) onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  } finally {
    if (generation === token) loading.value = false
  }
}
onMounted(() => {
  void load()
})
onScopeDispose(() => {
  ++token
})
</script>
<template>
  <a-modal
    :open="true"
    :width="720"
    :title="t('Setting.chooseHouse')"
    :footer="null"
    @cancel="emit('close')"
  >
    <a-input-search
      v-model:value="keyword"
      :placeholder="t('Setting.searchHouse')"
      allow-clear
      @search="load(0)"
    />
    <a-spin :spinning="loading || busy">
      <div class="setting-house-picker">
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
</style>
