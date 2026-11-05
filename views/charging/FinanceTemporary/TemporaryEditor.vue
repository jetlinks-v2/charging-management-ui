<script setup lang="ts">
import { queryTemporaryHouses } from '../../../api/financeTemporary'
import { useTemporaryEditor } from '../../../hooks/finance-temporary/useTemporaryEditor'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import SettingHousePicker from '../FinanceSetting/SettingHousePicker.vue'
import PaymentSummary from '../FinanceCashier/PaymentSummary.vue'
import TemporarySourceFields from './TemporarySourceFields.vue'
import TemporaryPaymentFields from './TemporaryPaymentFields.vue'
import '../FinanceCashier/cashier.css'
const props = defineProps<{ projectId: string; initialSpace?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const state = useTemporaryEditor(props, () => emit('saved'))
const { t, model, form, picker, loading, confirmation, uploading, invalidFiles, balanced, calculate, pick } = state
const { preview, result, calculating, saving, uncertain, failed, invalidate, submit } = confirmation
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uploading.value && !uncertain.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="960"
    icon="WalletOutlined"
    :title="t(result ? 'Cashier.paymentInfo' : 'Temporary.collect')"
    :sub="t('Temporary.hint')"
    @update:open="close"
  >
    <div class="cashier-editor">
      <PaymentSummary
        v-if="result"
        :detail="result"
      />
      <template v-else>
        <a-steps
          size="small"
          :current="preview ? 1 : 0"
          :items="[{ title: t('Cashier.edit') }, { title: t('Cashier.confirmTitle') }]"
        />
        <template v-if="preview">
          <div class="cashier-amount">
            <span>{{ t('Temporary.amount') }}</span>
            <strong>{{ preview.total }}</strong>
          </div>
          <SectionCard
            icon="HomeOutlined"
            :title="t('Funds.source')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Setting.house'), value: preview.fullName },
                { label: t('Setting.customer'), value: preview.customerName },
                { label: t('Setting.subject'), value: preview.subjectName },
                { label: t('Setting.standard'), value: preview.standardName },
                { label: t('Temporary.startDate'), value: model.startDate },
                { label: t('Temporary.endDate'), value: model.endDate },
                { label: t('Temporary.accountPeriod'), value: model.accountPeriod },
                { label: t('Funds.quantity'), value: model.quantity || '—' }
              ]"
            />
          </SectionCard>
          <SectionCard
            icon="ProfileOutlined"
            :title="t('Cashier.paymentInfo')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Cashier.company'), value: preview.companyName },
                { label: t('Cashier.payer'), value: model.payerName },
                { label: t('Cashier.paidAt'), value: model.paidAt.replace('T', ' ') },
                { label: t('Setting.remark'), value: model.remark || '—' }
              ]"
            />
          </SectionCard>
          <SectionCard
            icon="WalletOutlined"
            :title="t('Cashier.funding')"
          >
            <div
              v-for="(row, index) in preview.funding"
              :key="index"
              class="cashier-preview-tender"
            >
              <span>
                {{ row.methodText }}
                <small>{{ row.bankName }}</small>
              </span>
              <strong>{{ row.amount }}</strong>
            </div>
          </SectionCard>
          <a-alert
            v-if="uncertain"
            type="warning"
            show-icon
            :message="t('Cashier.unknownResult')"
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
            :disabled="loading || calculating || saving || failed"
            class="cashier-form"
          >
            <TemporarySourceFields :state="state" />
            <TemporaryPaymentFields :state="state" />
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
          {{ t(uncertain ? 'Cashier.retry' : 'Cashier.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="loading || uploading || invalidFiles || failed || !balanced"
          @click="calculate"
        >
          {{ t('Cashier.preview') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
  <SettingHousePicker
    v-if="picker"
    :project-id="projectId"
    :busy="loading"
    :request="queryTemporaryHouses"
    @close="picker = false"
    @pick="pick"
  />
</template>
