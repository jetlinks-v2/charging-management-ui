<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FinanceStandard, StandardInput, StandardOptions } from '../../../api/financeStandard'
import { useStandardForm } from '../../../hooks/finance-standard/useStandardForm'
import { requestErrorMessage } from '../../../utils/requestError'
import StandardFormula from './StandardFormula.vue'
import StandardDelay from './StandardDelay.vue'
import StandardDetail from './StandardDetail.vue'
import StandardTaxPicker from './StandardTaxPicker.vue'
const props = defineProps<{
  open: boolean
  detail?: FinanceStandard
  options: StandardOptions
  projectId: string
  state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
}>()
const emit = defineEmits<{ close: []; retry: []; save: [StandardInput] }>()
const { t } = useI18n()
const { form, model, tax, variables, display, changeMethod, selectTax, submit } = useStandardForm(props, (input) =>
  emit('save', input)
)
const taxOpen = ref(false)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Standard.' + key) }) }]
const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="860"
    icon="CalculatorOutlined"
    :title="t('Standard.' + (state.readOnly ? 'detail' : detail ? 'edit' : 'create'))"
    :sub="detail?.standardName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="state.loading"
      active
      :paragraph="{ rows: 12 }"
    />
    <CloudEmpty
      v-else-if="state.failed"
      :description="t('Finance.detailFailed')"
    >
      <a-button @click="emit('retry')">{{ t('Finance.retry') }}</a-button>
    </CloudEmpty>
    <StandardDetail
      v-else-if="state.readOnly && detail"
      :detail="detail"
      :options="options"
    />
    <a-form
      v-else
      ref="form"
      :model="model"
      layout="vertical"
      :disabled="state.saving"
      class="standard-form"
    >
      <SectionCard
        icon="ProfileOutlined"
        :title="t('Standard.basic')"
      >
        <div class="finance-form-grid">
          <a-form-item
            name="standardName"
            :label="t('Standard.standardName')"
            :rules="required('standardName')"
          >
            <a-input
              v-model:value="model.standardName"
              :maxlength="30"
            />
          </a-form-item>
          <a-form-item
            name="standardCode"
            :label="t('Standard.standardCode')"
            :rules="required('standardCode')"
          >
            <a-input
              v-model:value="model.standardCode"
              :maxlength="60"
            />
          </a-form-item>
          <a-form-item
            name="subjectId"
            :label="t('Standard.subjectId')"
            :rules="required('subjectId')"
          >
            <a-select
              v-model:value="model.subjectId"
              show-search
              option-filter-prop="label"
              :options="options.subjects.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code }))"
              :placeholder="t('Standard.chooseSubject')"
            />
          </a-form-item>
        </div>
      </SectionCard>
      <SectionCard
        icon="FunctionOutlined"
        :title="t('Standard.formulaSection')"
      >
        <StandardFormula
          :model="model"
          :options="options"
          :variables="variables"
          :display="display"
          :project-id="projectId"
          @method="changeMethod"
        />
      </SectionCard>
      <SectionCard
        icon="FileTextOutlined"
        :title="t('Standard.taxSection')"
      >
        <a-form-item
          name="taxItemId"
          :label="t('Standard.taxItemId')"
          :rules="required('taxItemId')"
        >
          <div class="standard-tax-selection">
            <div v-if="tax">
              <strong>{{ tax.goodsName }}</strong>
              <p>{{ tax.companyName }} · {{ tax.goodsCode }} · {{ Number((Number(tax.taxRate) * 100).toFixed(6)) }}%</p>
            </div>
            <span
              v-else
              class="standard-muted"
            >
              {{ t('Standard.noTaxSelected') }}
            </span>
            <a-button @click="taxOpen = true">{{ t(tax ? 'Standard.changeTax' : 'Standard.chooseTax') }}</a-button>
          </div>
        </a-form-item>
      </SectionCard>
      <SectionCard
        icon="ClockCircleOutlined"
        :title="t('Standard.delaySection')"
      >
        <StandardDelay
          :model="model"
          :options="options"
        />
      </SectionCard>
      <SectionCard
        icon="CalendarOutlined"
        :title="t('Standard.validity')"
      >
        <div class="finance-form-grid">
          <a-form-item
            name="executeDate"
            :label="t('Standard.executeDate')"
          >
            <a-date-picker
              :value="model.executeDate ?? undefined"
              @update:value="model.executeDate = $event ? String($event) : null"
              value-format="YYYY-MM-DD"
              class="standard-full"
            />
          </a-form-item>
          <a-form-item
            name="cancelDate"
            :label="t('Standard.cancelDate')"
          >
            <a-date-picker
              :value="model.cancelDate ?? undefined"
              @update:value="model.cancelDate = $event ? String($event) : null"
              value-format="YYYY-MM-DD"
              class="standard-full"
            />
          </a-form-item>
        </div>
        <a-form-item
          name="remark"
          :label="t('Standard.remark')"
        >
          <a-textarea
            v-model:value="model.remark"
            :rows="2"
            :maxlength="300"
          />
        </a-form-item>
      </SectionCard>
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
  <StandardTaxPicker
    :open="taxOpen && open"
    :project-id="projectId"
    @close="taxOpen = false"
    @select="
      (row) => {
        selectTax(row)
        taxOpen = false
      }
    "
    @error="notify"
  />
</template>
<style src="../finance.css"></style>
<style scoped>
.standard-form :deep(.ant-form-item) {
  margin-bottom: 18px;
}
.standard-full {
  width: 100%;
}
.standard-tax-selection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.standard-tax-selection p {
  margin: 4px 0 0;
  color: var(--ink-3, #737373);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.standard-muted {
  color: var(--ink-3, #737373);
}
</style>
