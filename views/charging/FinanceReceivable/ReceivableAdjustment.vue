<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { FileUpload } from '@jetlinks-web-core/components'
import type { Receivable } from '../../../api/financeReceivable'
import { useReceivableAdjustment } from '../../../hooks/finance-receivable/useReceivableAdjustment'
import AdjustmentFormula from './AdjustmentFormula.vue'
import AdjustmentPreview from './AdjustmentPreview.vue'
const props = defineProps<{ projectId: string; detail: Receivable }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const {
  model,
  form,
  preview,
  calculating,
  saving,
  files,
  uploading,
  invalidFiles,
  calculate,
  submit,
  invalidate,
  filesChanged
} = useReceivableAdjustment(props, () => emit('saved'))
const required = (field: string) => [{ required: true, message: t('Finance.required', { field: t(field) }) }]
function close() {
  if (!saving.value && !calculating.value && !uploading.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="880"
    icon="AuditOutlined"
    :title="t('Adjustment.title')"
    :sub="detail.fullName"
    @update:open="close"
  >
    <div class="adjustment-workspace">
      <div class="adjustment-context">
        <a-tag color="processing">{{ t('Receivable.status.' + detail.periodStatus) }}</a-tag>
        <span>{{ detail.subjectName }} · {{ detail.customerName }}</span>
      </div>
      <a-steps
        :current="preview ? 1 : 0"
        size="small"
        :items="[{ title: t('Adjustment.edit') }, { title: t('Adjustment.confirmTitle') }]"
      />
      <AdjustmentPreview
        v-if="preview"
        :preview="preview"
      />
      <a-form
        v-else
        ref="form"
        :model="model"
        layout="vertical"
        :disabled="saving || calculating"
        class="adjustment-form"
      >
        <SectionCard
          icon="CalculatorOutlined"
          :title="t('Adjustment.method')"
        >
          <a-form-item
            :label="t('Adjustment.method')"
            name="adjustmentMode"
          >
            <a-radio-group
              v-model:value="model.adjustmentMode"
              button-style="solid"
            >
              <a-radio-button value="DIRECT">{{ t('Adjustment.direct') }}</a-radio-button>
              <a-radio-button value="FORMULA">{{ t('Adjustment.formula') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <div
            v-if="model.adjustmentMode === 'DIRECT'"
            class="adjustment-grid"
          >
            <a-form-item
              :label="t('Adjustment.direction')"
              name="directDirection"
            >
              <a-select
                v-model:value="model.directDirection"
                :options="[
                  { value: 'INCREASE', label: t('Adjustment.increase') },
                  { value: 'DECREASE', label: t('Adjustment.decrease') }
                ]"
              />
            </a-form-item>
            <a-form-item
              :label="t('Adjustment.directAmount')"
              name="directAmount"
              :rules="required('Adjustment.directAmount')"
            >
              <a-input-number
                v-model:value="model.directAmount"
                string-mode
                :precision="2"
                :min="'0.01'"
                :max="'999999999999999999.99'"
              />
            </a-form-item>
          </div>
          <AdjustmentFormula
            v-else
            :detail="detail"
            :model="model"
          />
        </SectionCard>
        <SectionCard
          icon="ReconciliationOutlined"
          :title="t('Adjustment.extra')"
        >
          <div class="adjustment-grid">
            <a-form-item
              :label="t('Receivable.assessmentAmount')"
              name="assessmentAmount"
            >
              <a-input-number
                v-model:value="model.assessmentAmount"
                string-mode
                :precision="2"
                :min="'0'"
                :max="'999999999999999999.99'"
              />
            </a-form-item>
            <a-form-item
              :label="t('Receivable.feeReductionAmount')"
              name="feeReductionAmount"
            >
              <a-input-number
                v-model:value="model.feeReductionAmount"
                string-mode
                :precision="2"
                :min="'0'"
                :max="'999999999999999999.99'"
              />
            </a-form-item>
            <a-form-item
              :label="t('Adjustment.dispatchCount')"
              name="temporaryDispatchCount"
            >
              <a-input-number
                v-model:value="model.temporaryDispatchCount"
                :precision="0"
                :min="0"
                :max="2147483647"
              />
            </a-form-item>
            <a-form-item
              :label="t('Adjustment.dispatchPrice')"
              name="temporaryDispatchUnitPrice"
            >
              <a-input-number
                v-model:value="model.temporaryDispatchUnitPrice"
                string-mode
                :precision="2"
                :min="'0'"
                :max="'999999999999999999.99'"
              />
            </a-form-item>
            <a-form-item
              :label="t('Receivable.lateFeeReductionAmount')"
              name="lateFeeReductionAmount"
            >
              <a-input-number
                v-model:value="model.lateFeeReductionAmount"
                string-mode
                :precision="2"
                :min="'0'"
                :max="'999999999999999999.99'"
              />
            </a-form-item>
            <a-form-item
              :label="t('Receivable.calculatedAsOfDate')"
              name="calculationAsOfDate"
              :rules="required('Receivable.calculatedAsOfDate')"
            >
              <a-date-picker
                v-model:value="model.calculationAsOfDate"
                value-format="YYYY-MM-DD"
                :allow-clear="false"
                :disabled-date="(date) => date.isAfter(dayjs(), 'day')"
              />
            </a-form-item>
          </div>
          <a-form-item
            :label="t('Adjustment.lateReason')"
            name="lateFeeReductionReason"
            :rules="
              model.lateFeeReductionAmount && !/^0(?:\.0+)?$/.test(model.lateFeeReductionAmount)
                ? required('Adjustment.lateReason')
                : []
            "
          >
            <a-textarea
              v-model:value="model.lateFeeReductionReason"
              :maxlength="1000"
              :rows="2"
            />
          </a-form-item>
        </SectionCard>
        <SectionCard
          icon="FileTextOutlined"
          :title="t('Adjustment.evidence')"
        >
          <a-form-item
            :label="t('Receivable.reason')"
            name="reason"
            :rules="[{ required: true, whitespace: true, message: t('Receivable.reasonRequired') }]"
          >
            <a-textarea
              v-model:value="model.reason"
              :maxlength="1000"
              :rows="3"
              show-count
            />
          </a-form-item>
          <a-form-item
            :label="t('Setting.remark')"
            name="remark"
          >
            <a-textarea
              v-model:value="model.remark"
              :maxlength="500"
              :rows="2"
              show-count
            />
          </a-form-item>
          <a-form-item :label="t('Adjustment.attachments')">
            <FileUpload
              :value="files"
              :size="20"
              :max-count="5"
              :disabled="saving || calculating"
              :btn-text="t('Adjustment.upload')"
              @upload-change="filesChanged"
            />
          </a-form-item>
        </SectionCard>
      </a-form>
    </div>
    <template #foot>
      <a-button
        :disabled="saving || calculating || uploading"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <a-button
        v-if="preview"
        :disabled="saving"
        @click="invalidate"
      >
        {{ t('Adjustment.back') }}
      </a-button>
      <a-button
        v-if="preview"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ t('Adjustment.confirm') }}
      </a-button>
      <a-button
        v-else
        type="primary"
        :loading="calculating"
        :disabled="uploading || invalidFiles"
        @click="calculate"
      >
        {{ t('Adjustment.preview') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style src="./adjustment.css"></style>
