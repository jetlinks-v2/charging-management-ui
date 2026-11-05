<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActivityInput, ActivityOptions } from '../../../api/financeActivity'
const props = defineProps<{ model: ActivityInput; options: ActivityOptions; saving: boolean }>()
const { t } = useI18n()
const spaceOptions = computed(() => props.options.spaces.map((node) => ({ value: node.id, label: node.fullName })))
const quarter = computed(() =>
  props.options.standards.find((row) => row.id === props.model.standardId)?.settlementMethod.startsWith('QUARTER')
)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Activity.' + key) }) }]
function uniqueTier() {
  const keys = props.model.tiers.map((row) => row.paidMonths + ':' + row.giftMonths)
  return new Set(keys).size === keys.length ? Promise.resolve() : Promise.reject(t('Activity.duplicateTier'))
}
const columns = computed(() => [
  { title: t('Activity.paidMonths'), key: 'paidMonths' },
  { title: t('Activity.giftMonths'), key: 'giftMonths' },
  { title: t('Finance.actions'), key: 'actions', width: 76 }
])
const offsetStart = computed({
  get: () => props.model.offsetStartDate ?? undefined,
  set: (value: string | undefined) => {
    props.model.offsetStartDate = value
  }
})
const offsetEnd = computed({
  get: () => props.model.offsetEndDate ?? undefined,
  set: (value: string | undefined) => {
    props.model.offsetEndDate = value
  }
})
const tierKey = (row: ActivityInput['tiers'][number]) => props.model.tiers.indexOf(row)
const quarterValidation = (_rule: unknown, value: number) =>
  quarter.value && value % 3 !== 0 ? Promise.reject(t('Activity.quarterHint')) : Promise.resolve()
const offsetValidation = () =>
  props.model.offsetStartDate && props.model.offsetEndDate && props.model.offsetStartDate > props.model.offsetEndDate
    ? Promise.reject(t('Activity.dateInvalid'))
    : Promise.resolve()
function setMonth(index: number, field: 'paidMonths' | 'giftMonths', value: unknown) {
  props.model.tiers[index][field] = typeof value === 'number' ? value : null
}
</script>
<template>
  <SectionCard
    icon="EnvironmentOutlined"
    :title="t('Activity.targets')"
  >
    <a-form-item
      name="targetIds"
      :rules="required('targets')"
    >
      <a-select
        v-model:value="model.targetIds"
        mode="multiple"
        show-search
        :options="spaceOptions"
        option-filter-prop="label"
        :placeholder="t('Activity.chooseTargets')"
        :max-tag-count="4"
      />
    </a-form-item>
    <p class="activity-note">{{ t('Activity.targetsHint') }}</p>
  </SectionCard>
  <SectionCard
    icon="GiftOutlined"
    :title="t('Activity.tiers')"
  >
    <p
      v-if="quarter"
      class="activity-note"
    >
      {{ t('Activity.quarterHint') }}
    </p>
    <a-form-item
      name="tiers"
      :rules="[{ validator: uniqueTier, trigger: 'change' }]"
    >
      <a-table
        :columns="columns"
        :data-source="model.tiers"
        :row-key="tierKey"
        :pagination="false"
        size="small"
        :scroll="{ x: 460 }"
      >
        <template #bodyCell="{ column, index }">
          <a-form-item
            v-if="column.key !== 'actions'"
            :name="['tiers', index, column.key === 'paidMonths' ? 'paidMonths' : 'giftMonths']"
            :rules="[
              { required: true, type: 'integer', min: 1, max: 1200, message: t('Activity.monthsInvalid') },
              {
                validator: quarterValidation
              }
            ]"
          >
            <a-input-number
              v-if="column.key === 'paidMonths'"
              :value="model.tiers[index].paidMonths ?? undefined"
              @update:value="(value) => setMonth(index, 'paidMonths', value)"
              :min="1"
              :max="1200"
              :precision="0"
            />
            <a-input-number
              v-else
              :value="model.tiers[index].giftMonths ?? undefined"
              @update:value="(value) => setMonth(index, 'giftMonths', value)"
              :min="1"
              :max="1200"
              :precision="0"
            />
          </a-form-item>
          <a-button
            v-else
            type="link"
            danger
            :disabled="saving || model.tiers.length < 2"
            @click="model.tiers.splice(index, 1)"
          >
            {{ t('Finance.delete') }}
          </a-button>
        </template>
      </a-table>
    </a-form-item>
    <a-button
      type="dashed"
      block
      :disabled="saving || model.tiers.length >= 100"
      @click="model.tiers.push({ paidMonths: null, giftMonths: null })"
    >
      <AIcon type="PlusOutlined" />
      {{ t('Activity.addTier') }}
    </a-button>
  </SectionCard>
  <SectionCard
    icon="SwapOutlined"
    :title="t('Activity.offset')"
  >
    <a-form-item :label="t('Activity.offsetArrears')"><a-switch v-model:checked="model.offsetArrears" /></a-form-item>
    <div
      v-if="model.offsetArrears"
      class="finance-form-grid"
    >
      <a-form-item
        name="offsetStartDate"
        :label="t('Activity.offsetStartDate')"
        :rules="required('offsetStartDate')"
      >
        <a-date-picker
          v-model:value="offsetStart"
          value-format="YYYY-MM-DD"
          :placeholder="t('Activity.offsetStartDate')"
        />
      </a-form-item>
      <a-form-item
        name="offsetEndDate"
        :label="t('Activity.offsetEndDate')"
        :rules="[
          ...required('offsetEndDate'),
          {
            validator: offsetValidation
          }
        ]"
      >
        <a-date-picker
          v-model:value="offsetEnd"
          value-format="YYYY-MM-DD"
          :placeholder="t('Activity.offsetEndDate')"
        />
      </a-form-item>
    </div>
  </SectionCard>
</template>
