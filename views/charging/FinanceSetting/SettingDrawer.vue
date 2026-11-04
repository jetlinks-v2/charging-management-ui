<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ChargeSetting, SettingOptions, SettingInput } from '../../../api/financeSetting'
import { useSettingForm } from '../../../hooks/finance-setting/useSettingForm'
import SettingDetail from './SettingDetail.vue'
import SettingHousePicker from './SettingHousePicker.vue'
const props = defineProps<{
  projectId: string
  detail?: ChargeSetting
  options: SettingOptions
  initialSpace?: string
  mode: 'single' | 'batch' | 'next'
  readOnly: boolean
  loading: boolean
  failed: boolean
  saving: boolean
}>()
const emit = defineEmits<{ close: []; save: [SettingInput[]] }>()
const { t } = useI18n()
const {
  form,
  model,
  targets,
  pickerOpen,
  loadingHouse,
  standard,
  subjectOptions,
  availableStandards,
  editableVariables,
  addHouse,
  changeSubject,
  changeStandard,
  submit
} = useSettingForm(props, (inputs) => emit('save', inputs))
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Setting.' + key) }) }]
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="820"
    icon="CalculatorOutlined"
    :title="
      t(
        readOnly
          ? 'Setting.detail'
          : mode === 'batch'
            ? 'Setting.batch'
            : mode === 'next'
              ? 'Setting.nextVersion'
              : detail
                ? 'Setting.edit'
                : 'Setting.create'
      )
    "
    :sub="detail?.fullName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 12 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <SettingDetail
      v-else-if="readOnly && detail"
      :detail="detail"
    />
    <a-form
      v-else
      ref="form"
      :model="model"
      layout="vertical"
      :disabled="saving"
      class="setting-form"
    >
      <SectionCard
        icon="HomeOutlined"
        :title="t('Setting.houseAndCustomer')"
      >
        <div
          v-for="(target, index) in targets"
          :key="target.context.house.spaceId"
          class="setting-target"
        >
          <div class="setting-target-heading">
            <div>
              <strong>{{ target.context.house.fullName }}</strong>
              <p>{{ t('Setting.billingArea') }} {{ target.context.house.billingArea }} m²</p>
            </div>
            <a-button
              v-if="mode === 'batch'"
              type="text"
              :aria-label="t('Setting.removeHouse')"
              @click="targets.splice(index, 1)"
            >
              <AIcon type="CloseOutlined" />
            </a-button>
          </div>
          <a-form-item
            :label="t('Setting.customer')"
            required
          >
            <a-select
              v-model:value="target.relationshipId"
              :disabled="!target.context.customers.length"
              show-search
              option-filter-prop="label"
              :placeholder="t('Setting.chooseCustomer')"
              :options="
                target.context.customers.map((row) => ({
                  value: row.relationshipId,
                  label: row.name + (row.telephone ? ' · ' + row.telephone : '')
                }))
              "
            />
            <span
              v-if="!target.context.customers.length"
              class="setting-help"
            >
              {{ t('Setting.noCustomers') }}
            </span>
          </a-form-item>
        </div>
        <a-button
          v-if="!detail || mode === 'batch'"
          :loading="loadingHouse"
          :disabled="targets.length >= 200"
          @click="pickerOpen = true"
        >
          <AIcon type="PlusOutlined" />
          {{ t(targets.length && mode !== 'batch' ? 'Setting.changeHouse' : 'Setting.chooseHouse') }}
        </a-button>
        <a-spin v-else-if="loadingHouse" />
      </SectionCard>
      <SectionCard
        icon="ProfileOutlined"
        :title="t('Setting.chargeRule')"
      >
        <div class="finance-form-grid">
          <a-form-item
            name="projectSubjectId"
            :label="t('Setting.subject')"
            :rules="required('subject')"
          >
            <a-select
              v-model:value="model.projectSubjectId"
              :options="subjectOptions"
              show-search
              option-filter-prop="label"
              :disabled="!!detail"
              @change="changeSubject"
            />
          </a-form-item>
          <a-form-item
            name="standardId"
            :label="t('Setting.standard')"
            :rules="required('standard')"
          >
            <a-select
              v-model:value="model.standardId"
              :options="
                availableStandards.map((row) => ({ value: row.id, label: row.standardName + ' · ' + row.standardCode }))
              "
              show-search
              option-filter-prop="label"
              :placeholder="t('Setting.chooseStandard')"
              @change="changeStandard"
            />
          </a-form-item>
          <a-form-item
            name="effectiveStartDate"
            :label="t('Setting.start')"
            :rules="required('start')"
          >
            <a-date-picker
              v-model:value="model.effectiveStartDate"
              value-format="YYYY-MM-DD"
              class="setting-full"
            />
          </a-form-item>
          <a-form-item
            name="effectiveEndDate"
            :label="t('Setting.end')"
          >
            <a-date-picker
              :value="model.effectiveEndDate || undefined"
              value-format="YYYY-MM-DD"
              :placeholder="t('Setting.unlimited')"
              class="setting-full"
              @update:value="model.effectiveEndDate = $event ? String($event) : null"
            />
          </a-form-item>
        </div>
        <p
          v-if="standard"
          class="setting-help"
        >
          {{ t('Setting.standardValidity') }}：{{ standard.executeDate || t('Standard.unlimitedStart') }} ～
          {{ standard.cancelDate || t('Setting.unlimited') }}
        </p>
      </SectionCard>
      <SectionCard
        v-if="standard"
        icon="FunctionOutlined"
        :title="t('Setting.formula')"
      >
        <div class="setting-rule-summary">
          <strong>{{ standard.price }}</strong>
          <span>{{ t('Setting.' + standard.settlementMethod) }}</span>
        </div>
        <p class="setting-formula">{{ standard.formulaDisplay }}</p>
        <div
          v-if="editableVariables.length"
          class="finance-form-grid"
        >
          <a-form-item
            v-for="variable in editableVariables"
            :key="variable.variableCode"
            :name="['variableValues', variable.variableCode]"
            :label="variable.variableName"
            :rules="[{ required: true, message: t('Finance.required', { field: variable.variableName }) }]"
          >
            <a-input-number
              v-model:value="model.variableValues[variable.variableCode]"
              string-mode
              :min="0"
              :precision="6"
              class="setting-full"
            />
          </a-form-item>
        </div>
        <p class="setting-help">{{ t('Setting.trustedHint') }}</p>
      </SectionCard>
      <a-form-item
        name="remark"
        :label="t('Setting.remark')"
      >
        <a-textarea
          v-model:value="model.remark"
          :rows="2"
          :maxlength="300"
        />
      </a-form-item>
    </a-form>
    <template #foot>
      <a-button
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t(readOnly ? 'Finance.close' : 'Finance.cancel') }}
      </a-button>
      <a-button
        v-if="!readOnly && !loading && !failed"
        type="primary"
        :loading="saving"
        :disabled="loadingHouse"
        @click="submit"
      >
        {{ t('Setting.saveAndGenerate') }}
      </a-button>
    </template>
    <SettingHousePicker
      v-if="pickerOpen"
      :project-id="projectId"
      :busy="loadingHouse"
      @close="pickerOpen = false"
      @pick="addHouse"
    />
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
<style scoped>
.setting-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.setting-target {
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.setting-target-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.setting-target-heading strong {
  overflow-wrap: anywhere;
}
.setting-target-heading p {
  margin: 6px 0 0;
  color: var(--ant-color-text-secondary, #595959);
}
.setting-full {
  width: 100%;
}
.setting-help {
  color: var(--ant-color-text-secondary, #595959);
  line-height: 1.7;
  margin: 8px 0 0;
}
.setting-rule-summary {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.setting-rule-summary strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.setting-formula {
  margin: 12px 0 18px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
@media (max-width: 560px) {
  .setting-form .finance-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
