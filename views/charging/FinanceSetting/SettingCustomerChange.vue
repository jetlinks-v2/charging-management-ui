<script setup lang="ts">
import { computed, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { ChargeSetting, SettingInput, SettingOptions } from '../../../api/financeSetting'
import { useSettingForm } from '../../../hooks/finance-setting/useSettingForm'
const props = defineProps<{
  projectId: string
  detail?: ChargeSetting
  options: SettingOptions
  loading: boolean
  failed: boolean
  saving: boolean
}>()
const emit = defineEmits<{ close: []; save: [SettingInput[]] }>()
const { t } = useI18n()
const { targets, rules, loadingHouse, submit } = useSettingForm(
  {
    get projectId() {
      return props.projectId
    },
    get detail() {
      return props.detail
    },
    get options() {
      return props.options
    },
    mode: 'next',
    readOnly: false
  },
  (inputs) => emit('save', inputs)
)
const start = dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD')
// 复用版本审批，不改本月及历史账单；当前月交接由应收拆分单独处理。
watch(
  rules,
  () => {
    rules.value[0].effectiveStartDate = start
  },
  { immediate: true }
)
const choices = computed(() => targets.value[0]?.context.customers || [])
const selected = computed({
  get: () => targets.value[0]?.relationshipIds || [],
  set: (ids: string[]) => {
    if (targets.value[0]) targets.value[0].relationshipIds = ids
  }
})
const changed = computed(() => {
  const previous = props.detail?.customerRelationshipIds || []
  return (
    selected.value.length > 0 &&
    (previous.length !== selected.value.length || selected.value.some((id) => !previous.includes(id)))
  )
})
const validPeriod = computed(
  () =>
    !!props.detail &&
    start > props.detail.effectiveStartDate &&
    (!props.detail.effectiveEndDate || start <= props.detail.effectiveEndDate)
)
const ready = computed(
  () => !props.loading && !props.failed && !loadingHouse.value && validPeriod.value && changed.value
)
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Setting.changeCustomer')"
    :width="560"
    :confirm-loading="saving"
    :ok-text="t('Setting.saveAndGenerate')"
    :ok-button-props="{ disabled: !ready }"
    :mask-closable="!saving"
    @cancel="!saving && emit('close')"
    @ok="ready && !saving && submit()"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 4 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <template v-else-if="detail">
      <a-descriptions
        :column="1"
        size="small"
      >
        <a-descriptions-item :label="t('Setting.house')">{{ detail.fullName }}</a-descriptions-item>
        <a-descriptions-item :label="t('Setting.standard')">{{ detail.standardName }}</a-descriptions-item>
        <a-descriptions-item :label="t('Setting.standardEnds')">
          {{ detail.snapshot.standard.cancelDate || t('Setting.unlimited') }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('Setting.settingEnds')">
          {{ detail.effectiveEndDate || t('Setting.unlimited') }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('Setting.currentCustomers')">
          {{ detail.customerNames.join('、') }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('Setting.changeStarts')">{{ start }}</a-descriptions-item>
      </a-descriptions>
      <a-form
        layout="vertical"
        class="customer-change-form"
      >
        <a-form-item
          :label="t('Setting.newCustomers')"
          required
        >
          <a-select
            v-model:value="selected"
            mode="multiple"
            :loading="loadingHouse"
            :disabled="saving || loadingHouse || !validPeriod"
            show-search
            option-filter-prop="label"
            :placeholder="t('Setting.chooseCustomer')"
            :options="
              choices.map((row) => ({
                value: row.relationshipId,
                label: row.name + (row.telephone ? ' · ' + row.telephone : '')
              }))
            "
          />
        </a-form-item>
      </a-form>
      <a-alert
        type="info"
        show-icon
        :message="t('Setting.changeCurrentMonthNotice')"
        class="customer-change-notice"
      />
      <a-alert
        v-if="!validPeriod"
        type="warning"
        show-icon
        :message="t('Setting.changePeriodInvalid')"
      />
    </template>
  </a-modal>
</template>
<style scoped>
.customer-change-form {
  margin-top: 20px;
}
.customer-change-notice {
  margin-bottom: 12px;
}
</style>
