<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import type { CarryInput, CarryPlan, CarrySubject } from '../../../api/financeCarry'
const props = defineProps<{ detail?: CarryPlan; subjects: CarrySubject[]; saving: boolean }>()
const emit = defineEmits<{ save: [input: CarryInput]; cancel: [] }>()
const { t } = useI18n(),
  form = ref<FormInstance>()
const initial = (): CarryInput => ({
  name: '',
  subjectIds: [],
  periodStart: '',
  periodEnd: '',
  frequency: 'MONTHLY',
  executeDay: '1',
  executeAt: '01:00:00',
  zone: 'Asia/Shanghai',
  enabled: true,
  includeLateFee: false,
  remissionMode: 'NONE',
  remissionValue: null
})
const model = ref<CarryInput>(initial())
const remissionAmount = computed<string | number | undefined>({
  get: () => model.value.remissionValue ?? undefined,
  set: (value) => {
    model.value.remissionValue = value === undefined ? null : String(value)
  }
})
watch(
  () => props.detail,
  (row) => {
    model.value = row ? { ...row.input, subjectIds: [...row.input.subjectIds] } : initial()
  },
  { immediate: true }
)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Carry.' + key) }) }]
const days = computed(() =>
  Array.from({ length: model.value.frequency === 'WEEKLY' ? 7 : 31 }, (_, i) => ({
    value: String(i + 1),
    label: model.value.frequency === 'WEEKLY' ? t('Carry.week' + (i + 1)) : t('Carry.day', { day: i + 1 })
  }))
)
const month = computed({
  get: () => model.value.executeDay.slice(0, 2),
  set: (value) => {
    model.value.executeDay = value + '-01'
  }
})
const day = computed({
  get: () => model.value.executeDay.slice(3),
  set: (value) => {
    model.value.executeDay = month.value + '-' + value
  }
})
const yearDays = computed(() =>
  Array.from({ length: new Date(2000, Number(month.value || 1), 0).getDate() }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: t('Carry.day', { day: i + 1 })
  }))
)
function frequency(value: unknown) {
  if (value !== 'DAILY' && value !== 'WEEKLY' && value !== 'MONTHLY' && value !== 'YEARLY') return
  model.value.frequency = value
  model.value.executeDay = value === 'DAILY' ? '' : value === 'YEARLY' ? '01-01' : '1'
}
async function submit() {
  try {
    await form.value?.validate()
  } catch {
    return
  }
  emit('save', {
    ...model.value,
    subjectIds: [...model.value.subjectIds],
    remissionValue: model.value.remissionMode === 'NONE' ? null : model.value.remissionValue
  })
}
</script>
<template>
  <a-form
    ref="form"
    :model="model"
    layout="vertical"
    :disabled="saving"
    class="carry-sections"
  >
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Carry.scope')"
    >
      <a-form-item
        name="name"
        :label="t('Carry.name')"
        :rules="required('name')"
      >
        <a-input
          v-model:value="model.name"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item
        name="subjectIds"
        :label="t('Carry.subjects')"
        :rules="required('subjects')"
      >
        <a-select
          v-model:value="model.subjectIds"
          mode="multiple"
          show-search
          option-filter-prop="label"
          :max-tag-count="3"
          :options="
            subjects.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code, disabled: !row.enabled }))
          "
          :placeholder="t('Carry.chooseSubjects')"
        />
      </a-form-item>
      <div class="finance-form-grid">
        <a-form-item
          name="periodStart"
          :label="t('Carry.periodStart')"
          :rules="required('periodStart')"
        >
          <a-date-picker
            :placeholder="t('Carry.periodStart')"
            v-model:value="model.periodStart"
            value-format="YYYY-MM-DD"
            class="carry-full"
          />
        </a-form-item>
        <a-form-item
          name="periodEnd"
          :label="t('Carry.periodEnd')"
          :rules="[
            ...required('periodEnd'),
            {
              validator: async () => {
                if (model.periodEnd && model.periodStart && model.periodEnd < model.periodStart)
                  throw new Error(t('Carry.periodInvalid'))
              }
            }
          ]"
        >
          <a-date-picker
            :placeholder="t('Carry.periodEnd')"
            v-model:value="model.periodEnd"
            value-format="YYYY-MM-DD"
            class="carry-full"
          />
        </a-form-item>
      </div>
      <p class="carry-note">{{ t('Carry.scopeHint') }}</p>
    </SectionCard>
    <SectionCard
      icon="ClockCircleOutlined"
      :title="t('Carry.schedule')"
    >
      <div class="finance-form-grid">
        <a-form-item
          name="frequency"
          :label="t('Carry.frequency')"
          :rules="required('frequency')"
        >
          <a-select
            :value="model.frequency"
            :options="['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((value) => ({ value, label: t('Carry.' + value) }))"
            @change="frequency"
          />
        </a-form-item>
        <a-form-item
          v-if="model.frequency !== 'DAILY'"
          name="executeDay"
          :label="t('Carry.executeDay')"
          :rules="required('executeDay')"
        >
          <a-space
            v-if="model.frequency === 'YEARLY'"
            class="carry-year"
          >
            <a-select
              v-model:value="month"
              :aria-label="t('Carry.month')"
              :options="
                Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1).padStart(2, '0'),
                  label: t('Carry.monthValue', { month: i + 1 })
                }))
              "
            />
            <a-select
              v-model:value="day"
              :aria-label="t('Carry.executeDay')"
              :options="yearDays"
            />
          </a-space>
          <a-select
            v-else
            v-model:value="model.executeDay"
            :options="days"
          />
        </a-form-item>
        <a-form-item
          name="executeAt"
          :label="t('Carry.executeAt')"
          :rules="required('executeAt')"
        >
          <a-time-picker
            v-model:value="model.executeAt"
            value-format="HH:mm:ss"
            format="HH:mm"
            class="carry-full"
          />
        </a-form-item>
        <a-form-item
          name="zone"
          :label="t('Carry.zone')"
          :rules="required('zone')"
        >
          <a-select
            v-model:value="model.zone"
            show-search
            :options="
              Array.from(new Set(['Asia/Shanghai', 'Asia/Hong_Kong', 'UTC', ...(model.zone ? [model.zone] : [])])).map(
                (value) => ({ value, label: value })
              )
            "
          />
        </a-form-item>
      </div>
      <p
        v-if="model.frequency === 'MONTHLY' || model.frequency === 'YEARLY'"
        class="carry-note"
      >
        {{ t('Carry.calendarHint') }}
      </p>
    </SectionCard>
    <SectionCard
      icon="AccountBookOutlined"
      :title="t('Carry.paymentRules')"
    >
      <div class="finance-form-grid">
        <a-form-item :label="t('Carry.includeLateFee')">
          <a-switch v-model:checked="model.includeLateFee" />
        </a-form-item>
        <a-form-item :label="t('Carry.enabled')"><a-switch v-model:checked="model.enabled" /></a-form-item>
        <a-form-item
          name="remissionMode"
          :label="t('Carry.remissionMode')"
        >
          <a-select
            v-model:value="model.remissionMode"
            :options="['NONE', 'DISCOUNT', 'FIXED'].map((value) => ({ value, label: t('Carry.' + value) }))"
            @change="model.remissionValue = null"
          />
        </a-form-item>
        <a-form-item
          v-if="model.remissionMode !== 'NONE'"
          name="remissionValue"
          :label="t('Carry.' + (model.remissionMode === 'DISCOUNT' ? 'discountValue' : 'fixedValue'))"
          :rules="required('remissionValue')"
        >
          <a-input-number
            v-model:value="remissionAmount"
            string-mode
            :precision="2"
            :min="'0.01'"
            :max="model.remissionMode === 'DISCOUNT' ? '10' : undefined"
            class="carry-full"
          />
        </a-form-item>
      </div>
      <p class="carry-note">{{ t('Carry.paymentHint') }}</p>
    </SectionCard>
    <StickyActionBar>
      <a-button
        :disabled="saving"
        @click="emit('cancel')"
      >
        {{ t('Finance.cancel') }}
      </a-button>
      <j-permission-button
        type="primary"
        hasPermission="charging/FinanceCarry:save"
        :loading="saving"
        @click="submit"
      >
        {{ t('Finance.save') }}
      </j-permission-button>
    </StickyActionBar>
  </a-form>
</template>
<style src="../finance.css"></style>
<style scoped src="./CarryEditor.css"></style>
