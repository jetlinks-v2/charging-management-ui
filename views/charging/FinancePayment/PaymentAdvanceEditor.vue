<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PaymentRecord } from '../../../api/financeCashier'
import { queryAdvanceHouses } from '../../../api/financePaymentToAdvance'
import { usePaymentToAdvance } from '../../../hooks/finance-cashier/usePaymentToAdvance'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import SettingHousePicker from '../FinanceSetting/SettingHousePicker.vue'
import RefundSources from '../FinanceRefund/RefundSources.vue'
import PaymentAdvanceFields from './PaymentAdvanceFields.vue'
import '../FinanceCashier/cashier.css'
const props = defineProps<{ projectId: string; rows: PaymentRecord[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = usePaymentToAdvance(props.projectId, props.rows, () => emit('saved'))
const { confirmation, model, sourceRows, form, loading, ready, picker, pick, calculate } = state
const { preview, result, saving, calculating, uncertain, failed, invalidate, submit } = confirmation
useProjectSwitchGuard(() => !!result.value)
const target = computed(() =>
  preview.value
    ? [
        { label: t('Funds.targetHouse'), value: preview.value.fullName },
        { label: t('Funds.targetCustomer'), value: preview.value.customerName },
        { label: t('PaymentAdvance.targetCompany'), value: preview.value.companyName },
        { label: t('Funds.targetStandard'), value: preview.value.standardName },
        { label: t('Funds.before'), value: preview.value.beforeBalance },
        { label: t('Funds.after'), value: preview.value.afterBalance },
        { label: t('Funds.occurredAt'), value: formatFinanceTime(model.occurredAt) },
        { label: t('Funds.reason'), value: model.reason },
        ...(model.startDate
          ? [
              { label: t('Receivable.calcStartDate'), value: model.startDate },
              { label: t('Receivable.calcEndDate'), value: model.endDate }
            ]
          : [])
      ]
    : []
)
function close() {
  if (!saving.value && !calculating.value && !uncertain.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="960"
    icon="SwapOutlined"
    :title="t('PaymentAdvance.title')"
    @update:open="close"
  >
    <a-spin :spinning="loading">
      <div class="cashier-editor">
        <template v-if="result">
          <div class="cashier-success">
            <AIcon type="CheckCircleFilled" />
            <div>
              <span>{{ t('PaymentAdvance.succeeded') }}</span>
              <strong class="cashier-money">{{ result.entry.amount }}</strong>
            </div>
          </div>
          <SectionCard
            icon="ProfileOutlined"
            :title="t('PaymentAdvance.target')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Funds.transactionId'), value: result.entry.transactionId },
                { label: t('Setting.house'), value: result.account.fullName },
                { label: t('Setting.customer'), value: result.account.customerName },
                { label: t('Setting.standard'), value: result.account.standardName },
                { label: t('Cashier.company'), value: result.account.companyName },
                { label: t('Funds.balance'), value: result.account.balance },
                { label: t('Funds.reason'), value: result.entry.reason }
              ]"
            />
          </SectionCard>
        </template>
        <template v-else>
          <a-steps
            size="small"
            :current="preview ? 1 : 0"
            :items="[{ title: t('Funds.fill') }, { title: t('Funds.review') }]"
          />
          <div
            v-if="preview"
            class="cashier-amount"
          >
            <span>{{ t('PaymentAdvance.amount') }}</span>
            <strong>{{ preview.amount }}</strong>
          </div>
          <SectionCard
            icon="UnorderedListOutlined"
            :title="t('PaymentAdvance.source')"
          >
            <KvGrid
              :cols="2"
              :items="[
                {
                  label: t('PaymentAdvance.sourceCompany'),
                  value: preview?.sourceCompanyName || sourceRows[0]?.companyName
                }
              ]"
            />
            <RefundSources
              :rows="sourceRows"
              :preview="preview"
              amount-label="PaymentAdvance.amount"
            />
          </SectionCard>
          <template v-if="preview">
            <SectionCard
              icon="HomeOutlined"
              :title="t('PaymentAdvance.target')"
            >
              <KvGrid
                :cols="2"
                :items="target"
              />
            </SectionCard>
            <a-alert
              type="info"
              show-icon
              :message="t('PaymentAdvance.effect')"
            />
            <a-alert
              v-if="uncertain"
              type="warning"
              show-icon
              :message="t('Funds.unknown')"
            />
          </template>
          <a-form
            v-else
            ref="form"
            :model="model"
            layout="vertical"
            class="cashier-form"
            :disabled="loading || saving || calculating || failed || !ready"
          >
            <PaymentAdvanceFields :state="state" />
          </a-form>
        </template>
      </div>
    </a-spin>
    <template #foot>
      <a-button
        :disabled="saving || calculating || uncertain"
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
          {{ t(uncertain ? 'Cashier.retry' : 'PaymentAdvance.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="loading || failed || !ready"
          @click="calculate"
        >
          {{ t('Funds.review') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
  <SettingHousePicker
    v-if="picker"
    :project-id="projectId"
    :busy="loading"
    :request="queryAdvanceHouses"
    @close="picker = false"
    @pick="pick"
  />
</template>
