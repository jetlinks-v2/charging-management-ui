<script setup lang="ts">
import type { useTemporaryEditor } from '../../../hooks/finance-temporary/useTemporaryEditor'
const props = defineProps<{ state: ReturnType<typeof useTemporaryEditor> }>()
const { t, model, picker, house, subjects, availableStandards } = props.state
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="HomeOutlined"
    :title="t('Funds.source')"
  >
    <a-form-item
      :label="t('Setting.house')"
      name="spaceId"
      :rules="required('Setting.house')"
    >
      <div class="temporary-house">
        <div>
          <strong>{{ house?.house.fullName || t('Setting.chooseHouse') }}</strong>
          <small>{{ house?.house.spaceLocation || house?.house.spaceTypeName || t('Temporary.houseHint') }}</small>
        </div>
        <a-button @click="picker = true">{{ t('Setting.chooseHouse') }}</a-button>
      </div>
    </a-form-item>
    <div class="cashier-grid">
      <a-form-item
        :label="t('Setting.customer')"
        name="relationshipId"
        :rules="required('Setting.customer')"
      >
        <a-select
          :value="model.relationshipId || undefined"
          @change="(value) => (model.relationshipId = String(value))"
          :disabled="!house"
          :placeholder="t('Cashier.choosePayer')"
          :options="house?.customers.map((v) => ({ value: v.relationshipId, label: v.name })) || []"
        />
      </a-form-item>
      <a-form-item
        :label="t('Funds.collectionSubject')"
        name="subjectId"
        :rules="required('Funds.collectionSubject')"
      >
        <a-select
          v-model:value="model.subjectId"
          show-search
          option-filter-prop="label"
          :options="subjects.map((v) => ({ value: v.id, label: v.name }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Setting.standard')"
        name="standardId"
        :rules="required('Setting.standard')"
      >
        <a-select
          :value="model.standardId || undefined"
          @change="(value) => (model.standardId = String(value))"
          show-search
          option-filter-prop="label"
          :disabled="!model.subjectId"
          :options="availableStandards.map((v) => ({ value: v.id, label: v.standardName }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Temporary.startDate')"
        name="startDate"
        :rules="required('Temporary.startDate')"
      >
        <a-date-picker
          v-model:value="model.startDate"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>
      <a-form-item
        :label="t('Temporary.endDate')"
        name="endDate"
        :rules="required('Temporary.endDate')"
      >
        <a-date-picker
          v-model:value="model.endDate"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>
      <a-form-item
        :label="t('Temporary.amount')"
        name="amount"
        :rules="required('Temporary.amount')"
      >
        <a-input-number
          v-model:value="model.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
          :max="'999999999999999999.99'"
        />
      </a-form-item>
    </div>
  </SectionCard>
</template>
<style scoped>
.temporary-house {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
}
.temporary-house div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.temporary-house small {
  display: block;
  margin-top: 4px;
  color: var(--ant-color-text-secondary, #595959);
}
@media (max-width: 640px) {
  .temporary-house {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
