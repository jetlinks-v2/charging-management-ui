<script setup lang="ts">
import type { useFundEditor } from '../../../hooks/finance-funds/useFundEditor'
const props = defineProps<{ state: ReturnType<typeof useFundEditor> }>()
const { t, model, house, target, picker, availableStandards, subjects, sourceStandards, standardChanged } = props.state
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <SectionCard
    icon="HomeOutlined"
    :title="t('Funds.source')"
  >
    <template v-if="model.action === 'TOPUP'">
      <a-form-item
        :label="t('Setting.house')"
        name="spaceId"
        :rules="required('Setting.house')"
      >
        <a-button
          block
          @click="picker = 'source'"
        >
          {{ house?.house.fullName || t('Setting.chooseHouse') }}
        </a-button>
      </a-form-item>
      <div class="cashier-grid">
        <a-form-item
          :label="t('Setting.customer')"
          name="relationshipId"
          :rules="required('Setting.customer')"
        >
          <a-select
            v-model:value="model.relationshipId"
            :disabled="!house"
            :options="house?.customers.map((v) => ({ value: v.relationshipId, label: v.name }))"
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
          :rules="model.type === 'ADVANCE' ? required('Setting.standard') : undefined"
        >
          <a-select
            v-model:value="model.standardId"
            allow-clear
            show-search
            :disabled="!model.subjectId"
            :options="sourceStandards.map((v) => ({ value: v.id, label: v.standardName }))"
            option-filter-prop="label"
            @change="standardChanged"
          />
        </a-form-item>
      </div>
    </template>
    <KvGrid
      v-else
      :cols="2"
      :items="[
        { label: t('Setting.house'), value: state.account?.fullName },
        { label: t('Setting.customer'), value: state.account?.customerName },
        { label: t('Setting.subject'), value: state.account?.subjectName },
        { label: t('Funds.balance'), value: state.account?.balance }
      ]"
    />
    <template v-if="model.action === 'TRANSFER'">
      <a-form-item
        :label="t('Funds.targetHouse')"
        name="targetSpaceId"
        :rules="required('Funds.targetHouse')"
      >
        <a-button
          block
          @click="picker = 'target'"
        >
          {{ target?.house.fullName || t('Setting.chooseHouse') }}
        </a-button>
      </a-form-item>
      <div class="cashier-grid">
        <a-form-item
          :label="t('Funds.targetCustomer')"
          name="targetRelationshipId"
          :rules="required('Funds.targetCustomer')"
        >
          <a-select
            v-model:value="model.targetRelationshipId"
            :disabled="!target"
            :options="target?.customers.map((v) => ({ value: v.relationshipId, label: v.name }))"
          />
        </a-form-item>
        <a-form-item
          :label="t('Funds.targetStandard')"
          name="targetStandardId"
          :rules="required('Funds.targetStandard')"
        >
          <a-select
            v-model:value="model.targetStandardId"
            :options="availableStandards.map((v) => ({ value: v.id, label: v.subjectName + ' · ' + v.standardName }))"
          />
        </a-form-item>
      </div>
    </template>
    <a-form-item
      v-if="model.action === 'DEDUCT'"
      :label="t('Funds.incomeStandard')"
      name="targetStandardId"
      :rules="required('Funds.incomeStandard')"
    >
      <a-select
        v-model:value="model.targetStandardId"
        :options="availableStandards.map((v) => ({ value: v.id, label: v.subjectName + ' · ' + v.standardName }))"
      />
    </a-form-item>
  </SectionCard>
</template>
