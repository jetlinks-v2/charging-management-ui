<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FinanceStandard, StandardInput, StandardOptions } from '../../../api/financeStandard'
import { useStandardForm } from '../../../hooks/finance-standard/useStandardForm'
import { requestErrorMessage } from '../../../utils/requestError'
import StandardFormula from './StandardFormula.vue'
import StandardDelay from './StandardDelay.vue'
import StandardDetail from './StandardDetail.vue'
import StandardTaxPicker from './StandardTaxPicker.vue'
import StandardTaxSummary from './StandardTaxSummary.vue'
const props = defineProps<{
  open: boolean
  detail?: FinanceStandard
  options: StandardOptions
  projectId: string
  projectName: string
  selectedSubjectId: string
  state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
}>()
const emit = defineEmits<{ close: []; retry: []; save: [StandardInput] }>()
const { t } = useI18n()
const { form, model, tax, variables, display, changeMethod, selectTax, submit } = useStandardForm(props, (input) =>
  emit('save', input)
)
const taxOpen = ref(false)
const subjectName = computed(
  () => props.detail?.subjectName || props.options.subjects.find((row) => row.id === model.subjectId)?.name || ''
)
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
          <a-form-item :label="t('ProjectContext.current')">
            <a-input
              :value="projectName"
              disabled
            />
          </a-form-item>
          <a-form-item
            name="subjectId"
            :label="t('Standard.subjectId')"
            :rules="required('subjectId')"
          >
            <a-input
              :value="subjectName"
              disabled
            />
          </a-form-item>
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
            v-if="detail"
            :label="t('Standard.standardCode')"
          >
            <a-input
              :value="detail?.standardCode"
              disabled
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
          <StandardTaxSummary
            :tax="tax"
            @select="taxOpen = true"
          />
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
              :placeholder="t('Standard.unlimitedStart')"
              :disabled-date="(date) => !!model.cancelDate && date.format('YYYY-MM-DD') > model.cancelDate"
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
              :placeholder="t('Standard.unlimitedEnd')"
              :disabled-date="(date) => !!model.executeDate && date.format('YYYY-MM-DD') < model.executeDate"
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
</style>
