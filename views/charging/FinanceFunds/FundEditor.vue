<script setup lang="ts">
import { computed } from 'vue'
import type { FundDraft } from '../../../api/financeFunds'
import { queryFundsHouses } from '../../../api/financeFunds'
import { useFundEditor } from '../../../hooks/finance-funds/useFundEditor'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import SettingHousePicker from '../FinanceSetting/SettingHousePicker.vue'
import FundSourceFields from './FundSourceFields.vue'
import FundPaymentFields from './FundPaymentFields.vue'
import FundBills from './FundBills.vue'
import FundOffsetPreview from './FundOffsetPreview.vue'
import '../FinanceCashier/cashier.css'
const title = computed(() =>
  t(
    result.value
      ? 'Funds.succeeded'
      : model.action === 'TOPUP'
      ? model.type === 'DEPOSIT'
        ? 'Funds.collectDeposit'
        : 'Funds.collectAdvance'
      : 'Funds.' + model.action
  )
)
const props = defineProps<{ projectId: string; draft: FundDraft }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const state = useFundEditor(props, () => emit('saved'))
const {
  t,
  form,
  loading,
  picker,
  model,
  confirmation,
  pick,
  calculate,
  paymentStep,
  uploading,
  invalidFiles,
  nextStep
} = state
const { preview, result, saving, calculating, uncertain, failed, invalidate, submit } = confirmation
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uncertain.value && !uploading.value) emit('close')
}
</script>
<template>
  <a-modal
    open
    centered
    :width="900"
    :title="title"
    :style="{ maxWidth: 'calc(100vw - 2rem)' }"
    :body-style="{ maxHeight: 'calc(100dvh - 13rem)', overflowY: 'auto' }"
    :mask-closable="false"
    :closable="!saving && !calculating && !uncertain && !uploading"
    :keyboard="!saving && !calculating && !uncertain && !uploading"
    @cancel="close"
  >
    <div class="cashier-editor">
      <template v-if="result">
        <div class="cashier-success">
          <AIcon type="CheckCircleFilled" />
          <div>
            <span>{{ t('Funds.succeeded') }}</span>
            <strong class="cashier-money">{{ result.entry.amount }}</strong>
          </div>
        </div>
        <SectionCard
          icon="ProfileOutlined"
          :title="t('Funds.operationInfo')"
        >
          <KvGrid
            :cols="2"
            :items="[
              { label: t('Funds.transactionId'), value: result.entry.transactionId },
              { label: t('Setting.house'), value: result.account.fullName },
              { label: t('Setting.customer'), value: result.account.customerName },
              { label: t('Funds.balance'), value: result.account.balance },
              { label: t('Funds.targetBalance'), value: result.target?.balance || '—' },
              { label: t('Funds.reason'), value: result.entry.reason }
            ]"
          />
        </SectionCard>
      </template>
      <template v-else>
        <a-steps
          size="small"
          :current="preview || paymentStep ? 1 : 0"
          :items="[{ title: t('Funds.fill') }, { title: t('Funds.review') }]"
        />
        <template v-if="preview">
          <div class="cashier-amount">
            <span>{{ t('Funds.amount') }}</span>
            <strong>{{ preview.amount }}</strong>
          </div>
          <SectionCard
            icon="ProfileOutlined"
            :title="t('Funds.operationInfo')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Setting.house'), value: preview.fullName },
                { label: t('Setting.customer'), value: preview.customerName },
                { label: t('Funds.collectionSubject'), value: preview.subjectName },
                { label: t('Cashier.company'), value: preview.companyName },
                { label: t('Funds.before'), value: preview.beforeBalance },
                { label: t('Funds.after'), value: preview.afterBalance },
                ...(preview.targetFullName
                  ? [
                      { label: t('Funds.targetHouse'), value: preview.targetFullName },
                      { label: t('Funds.targetCustomer'), value: preview.targetCustomerName },
                      { label: t('Funds.targetStandard'), value: preview.targetStandardName },
                      { label: t('Funds.targetBalance'), value: preview.targetBalance }
                    ]
                  : []),
                {
                  label: t('Cashier.method'),
                  value: [preview.methodText, preview.bankName].filter(Boolean).join(' · ')
                },
                { label: t('Funds.reason'), value: model.reason }
              ]"
            />
          </SectionCard>
          <FundOffsetPreview
            v-if="model.action === 'OFFSET'"
            :preview="preview"
            :items="model.items || []"
          />
          <a-alert
            v-if="uncertain"
            type="warning"
            show-icon
            :message="t('Funds.unknown')"
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
            <FundSourceFields
              v-if="model.action !== 'TOPUP' || !paymentStep"
              :state="state"
            />
            <div
              v-if="model.action === 'TOPUP' && paymentStep"
              class="cashier-amount"
            >
              <span>{{ t('Funds.amount') }}</span>
              <strong>{{ model.amount }}</strong>
            </div>
            <FundBills
              v-if="model.action === 'OFFSET' && draft.account"
              :project-id="projectId"
              :account="draft.account"
              @change="
                (items, total) => {
                  model.items = items
                  model.amount = total
                }
              "
            />
            <FundPaymentFields
              :state="state"
              :phase="model.action === 'TOPUP' ? (paymentStep ? 'payment' : 'business') : undefined"
            />
          </a-form>
        </a-spin>
      </template>
    </div>
    <template #footer>
      <a-button
        :disabled="saving || calculating || uncertain || uploading"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="!result">
        <a-button
          v-if="paymentStep && !preview"
          :disabled="calculating || saving || uploading"
          @click="paymentStep = false"
        >
          {{ t('Adjustment.back') }}
        </a-button>
        <a-button
          v-if="model.action === 'TOPUP' && !paymentStep && !preview"
          type="primary"
          :disabled="loading || failed"
          @click="nextStep"
        >
          {{ t('Funds.review') }}
        </a-button>
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
          {{ t(uncertain ? 'Cashier.retry' : 'Funds.confirm') }}
        </a-button>
        <a-button
          v-else-if="model.action !== 'TOPUP' || paymentStep"
          type="primary"
          :loading="calculating"
          :disabled="loading || failed || uploading || invalidFiles"
          @click="calculate"
        >
          {{ t('Funds.review') }}
        </a-button>
      </template>
    </template>
  </a-modal>
  <SettingHousePicker
    v-if="picker"
    :project-id="projectId"
    :busy="loading"
    :request="queryFundsHouses"
    @close="picker = undefined"
    @pick="pick"
  />
</template>
