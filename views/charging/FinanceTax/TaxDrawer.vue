<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaxInput, TaxItem } from '../../../api/financeTax'
import { useTaxForm } from '../../../hooks/finance-tax/useTaxForm'
import TaxHistoryDrawer from './TaxHistoryDrawer.vue'
const props = defineProps<{
  open: boolean
  detail?: TaxItem
  companyId?: string
  companies: { value: string; label: string }[]
  projectId: string
  state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
}>()
const emit = defineEmits<{ close: []; retry: []; save: [TaxInput] }>()
const { t } = useI18n()
const { form, model, ratePercent, price, stringFields, submit } = useTaxForm(props, (input) => emit('save', input))
const logsOpen = ref(false)
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="760"
    icon="FileTextOutlined"
    :title="t('FinanceTax.' + (state.readOnly ? 'detail' : detail ? 'edit' : 'create'))"
    :sub="detail?.goodsName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="state.loading"
      active
      :paragraph="{ rows: 8 }"
    />
    <CloudEmpty
      v-else-if="state.failed"
      :description="t('Finance.detailFailed')"
    >
      <a-button @click="emit('retry')">{{ t('Finance.retry') }}</a-button>
    </CloudEmpty>
    <a-form
      v-else
      ref="form"
      :model="model"
      layout="vertical"
      class="finance-company-form"
      :disabled="state.saving"
    >
      <div class="finance-form-grid">
        <a-form-item
          name="companyId"
          :label="t('Finance.companyName')"
          :rules="state.readOnly ? [] : [{ required: true, message: t('FinanceTax.chooseCompany') }]"
        >
          <span v-if="state.readOnly">{{ detail?.companyName || '—' }}</span>
          <a-select
            v-else
            v-model:value="model.companyId"
            :options="companies"
            :disabled="!!detail"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item
          v-if="state.readOnly"
          :label="t('FinanceTax.enabled')"
        >
          <a-tag :color="detail?.enabled ? 'success' : 'default'">
            {{ t('FinanceTax.' + (detail?.enabled ? 'active' : 'inactive')) }}
          </a-tag>
        </a-form-item>
        <a-form-item
          v-for="field in stringFields"
          :key="field.key"
          :name="field.key"
          :label="field.label"
          :rules="
            state.readOnly
              ? []
              : [{ required: field.required, whitespace: true, message: t('Finance.required', { field: field.label }) }]
          "
        >
          <span
            v-if="state.readOnly"
            class="finance-field-value"
          >
            {{ model[field.key] || '—' }}
          </span>
          <a-input
            v-else
            v-model:value="model[field.key]"
            :maxlength="field.max"
          />
        </a-form-item>
        <a-form-item
          name="taxRate"
          :label="t('FinanceTax.taxRate')"
          :rules="state.readOnly ? [] : [{ required: true, message: t('FinanceTax.rateRequired') }]"
        >
          <span v-if="state.readOnly">{{ ratePercent }}%</span>
          <a-input-number
            v-else
            v-model:value="ratePercent"
            :min="0"
            :max="100"
            :precision="4"
            :addon-after="'%'"
            class="tax-number"
          />
        </a-form-item>
        <a-form-item
          name="price"
          :label="t('FinanceTax.price')"
        >
          <span v-if="state.readOnly">{{ model.price ?? '—' }}</span>
          <a-input-number
            v-else
            v-model:value="price"
            string-mode
            :min="'0'"
            :max="'9999999999999.9999999999'"
            :precision="10"
            class="tax-number"
          />
        </a-form-item>
        <a-form-item
          name="includingTaxFlag"
          :label="t('FinanceTax.includingTaxFlag')"
        >
          <span v-if="state.readOnly">
            {{ t('FinanceTax.' + (model.includingTaxFlag === 1 ? 'including' : 'excluding')) }}
          </span>
          <a-radio-group
            v-else
            v-model:value="model.includingTaxFlag"
          >
            <a-radio :value="0">{{ t('FinanceTax.excluding') }}</a-radio>
            <a-radio :value="1">{{ t('FinanceTax.including') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          name="favouredPolicyFlag"
          :label="t('FinanceTax.favouredPolicyFlag')"
        >
          <span v-if="state.readOnly">{{ t('FinanceTax.' + (model.favouredPolicyFlag === 1 ? 'yes' : 'no')) }}</span>
          <a-radio-group
            v-else
            v-model:value="model.favouredPolicyFlag"
          >
            <a-radio :value="0">{{ t('FinanceTax.no') }}</a-radio>
            <a-radio :value="1">{{ t('FinanceTax.yes') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          name="favouredPolicyName"
          :label="t('FinanceTax.favouredPolicyName')"
          :rules="
            state.readOnly
              ? []
              : [
                  {
                    required: model.favouredPolicyFlag === 1,
                    whitespace: true,
                    message: t('FinanceTax.policyRequired')
                  }
                ]
          "
        >
          <span v-if="state.readOnly">{{ model.favouredPolicyName || '—' }}</span>
          <a-input
            v-else
            v-model:value="model.favouredPolicyName"
            :maxlength="255"
          />
        </a-form-item>
      </div>
      <div
        v-if="state.readOnly && detail"
        class="finance-audit"
      >
        {{ t('Finance.modified') }}：{{ detail.modifierName || '—' }} ·
        {{ detail.modifyTime ? new Date(detail.modifyTime).toLocaleString() : '—' }}
        <a-button
          type="link"
          @click="logsOpen = true"
        >
          {{ t('FinanceTax.operations') }}
        </a-button>
      </div>
    </a-form>
    <template #foot>
      <a-button
        :disabled="state.saving"
        @click="emit('close')"
      >
        {{ t('Finance.' + (state.readOnly ? 'close' : 'cancel')) }}
      </a-button>
      <a-button
        v-if="!state.readOnly"
        type="primary"
        :loading="state.saving"
        :disabled="state.loading || state.failed"
        @click="submit"
      >
        {{ t('Finance.save') }}
      </a-button>
    </template>
  </JlDrawerShell>
  <TaxHistoryDrawer
    :open="open && logsOpen"
    :project-id="projectId"
    :tax-id="detail?.id"
    @close="logsOpen = false"
  />
</template>
<style src="../finance.css"></style>
<style scoped>
.tax-number {
  width: 100%;
}
</style>
