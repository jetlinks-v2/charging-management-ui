<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PaymentRecord } from '../../../api/financeCashier'
import { useRefund } from '../../../hooks/finance-cashier/useRefund'
import { useRefundRecovery } from '../../../hooks/finance-cashier/useRefundRecovery'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import RefundSources from './RefundSources.vue'
import RefundForm from './RefundForm.vue'
import RefundSummary from './RefundSummary.vue'
import '../FinanceCashier/cashier.css'
const props = defineProps<{ projectId: string; rows: PaymentRecord[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useRefund(
  props,
  () => emit('saved'),
  useRefundRecovery(() => props.projectId)
)
const {
  model,
  form,
  sourceRows,
  available,
  loading,
  calculating,
  saving,
  uncertain,
  recoveryFailed,
  preview,
  result,
  uploading,
  invalidFiles,
  calculate,
  submit,
  invalidate
} = state
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uploading.value && !uncertain.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="960"
    icon="RollbackOutlined"
    :title="t(result ? 'Refund.info' : 'Refund.start')"
    @update:open="close"
  >
    <div class="cashier-editor">
      <RefundSummary
        v-if="result"
        :detail="result"
      />
      <template v-else>
        <a-steps
          :current="preview ? 1 : 0"
          size="small"
          :items="[{ title: t('Refund.edit') }, { title: t('Refund.confirmTitle') }]"
        />
        <template v-if="preview">
          <div class="cashier-amount">
            <span>{{ t('Refund.total') }}</span>
            <strong>{{ preview.total }}</strong>
          </div>
          <SectionCard
            icon="ProfileOutlined"
            :title="t('Refund.info')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Cashier.company'), value: preview.companyName },
                { label: t('Refund.receiver'), value: model.receiverName },
                { label: t('Refund.refundedAt'), value: model.refundedAt.replace('T', ' ') },
                {
                  label: t('Refund.method'),
                  value: [preview.methodText, preview.bankName].filter(Boolean).join(' · ')
                },
                { label: t('Refund.reason'), value: model.reason }
              ]"
            />
          </SectionCard>
          <SectionCard
            icon="UnorderedListOutlined"
            :title="t('Refund.sources')"
          >
            <RefundSources :preview="preview" />
          </SectionCard>
          <a-alert
            type="info"
            show-icon
            :message="t('Refund.restoresDebt')"
          />
          <a-alert
            v-if="uncertain"
            type="warning"
            show-icon
            :message="t('Refund.unknownResult')"
          />
        </template>
        <a-spin
          v-else
          :spinning="loading"
        >
          <a-form
            ref="form"
            :model="model"
            layout="vertical"
            :disabled="loading || calculating || saving"
            class="cashier-form"
          >
            <SectionCard
              icon="UnorderedListOutlined"
              :title="t('Refund.sources')"
            >
              <RefundSources :rows="sourceRows" />
              <div class="cashier-inline-total">
                {{ t('Refund.available') }}
                <strong>{{ available }}</strong>
              </div>
            </SectionCard>
            <RefundForm :state="state" />
          </a-form>
        </a-spin>
      </template>
    </div>
    <template #foot>
      <a-button
        :disabled="saving || calculating || uploading || uncertain"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="!result">
        <a-button
          v-if="preview"
          :disabled="saving || uncertain"
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
          {{ t(uncertain ? 'Cashier.retry' : 'Refund.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="loading || uploading || invalidFiles || recoveryFailed || !model.companyId || !model.optionId"
          @click="calculate"
        >
          {{ t('Refund.preview') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
