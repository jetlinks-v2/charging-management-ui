<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { PaymentRecord } from '../../../api/financeCashier'
import { usePaymentRecords } from '../../../hooks/finance-cashier/usePaymentRecords'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import PaymentSummary from '../FinanceCashier/PaymentSummary.vue'
import '../FinanceCashier/cashier.css'
const { t } = useI18n()
const { projectId, table, terms, params, open, loading, failed, detail, request, select, close, notify } =
  usePaymentRecords()
const rowKey = (row: PaymentRecord) => row.line.id
const fields = computed(() =>
  ['fullName', 'customerName', 'subjectName', 'methodText'].map((key) => ({
    title: t(key === 'methodText' ? 'Cashier.method' : 'Receivable.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'house', scopedSlots: true, width: 230 },
  { title: t('Receivable.subjectName'), dataIndex: 'subject', scopedSlots: true, width: 160 },
  { title: t('Cashier.payer'), dataIndex: 'payerName', width: 130 },
  { title: t('Cashier.method'), dataIndex: 'method', scopedSlots: true, width: 160 },
  { title: t('Cashier.amount'), dataIndex: 'amount', scopedSlots: true, width: 130, align: 'right' },
  { title: t('Cashier.paidAt'), dataIndex: 'paidAt', width: 190 },
  { title: t('Cashier.company'), dataIndex: 'companyName', width: 200 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 90, fixed: 'right' }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <j-page-container>
    <ProjectScopeBar />
    <section class="payment-workspace">
      <div class="payment-heading">
        <div>
          <h2>{{ t('Cashier.records') }}</h2>
          <span>{{ t('Cashier.recordsHint') }}</span>
        </div>
        <a-button
          :disabled="!projectId"
          :aria-label="t('Finance.refresh')"
          @click="table?.reload()"
        >
          <AIcon type="ReloadOutlined" />
        </a-button>
      </div>
      <ConditionFilter
        :fields="fields"
        @change="filter"
      />
      <j-pro-table
        v-if="projectId"
        ref="table"
        :row-key="rowKey"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :no-pagination="false"
        :pagination="{ pageSize: 12 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 1390 }"
        @request-error="notify"
      >
        <template #house="row">
          <a-button
            type="link"
            class="payment-house"
            @click="select(row.line.paymentId)"
          >
            {{ row.line.fullName }}
          </a-button>
        </template>
        <template #subject="row">
          {{ row.line.subjectName }}
          <small>{{ row.line.customerName }}</small>
        </template>
        <template #method="row">
          {{ row.line.methodText }}
          <small>{{ row.line.bankName || '—' }}</small>
        </template>
        <template #amount="row">
          <strong class="cashier-money">{{ row.line.amount }}</strong>
        </template>
        <template #actions="row">
          <a-button
            type="link"
            @click="select(row.line.paymentId)"
          >
            {{ t('Finance.detail') }}
          </a-button>
        </template>
        <template #emptyText><CloudEmpty :description="t('Cashier.noPayments')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectContext.choose')"
      />
    </section>
    <JlDrawerShell
      v-if="open"
      :open="true"
      :width="960"
      icon="WalletOutlined"
      :title="t('Cashier.paymentInfo')"
      @update:open="close"
    >
      <a-spin :spinning="loading">
        <div
          v-if="detail"
          class="cashier-editor"
        >
          <PaymentSummary :detail="detail" />
        </div>
        <CloudEmpty
          v-else-if="!loading"
          :description="t(failed ? 'Finance.failed' : 'Cashier.noPayments')"
        />
      </a-spin>
      <template #foot>
        <a-button @click="close">{{ t('Finance.close') }}</a-button>
      </template>
    </JlDrawerShell>
  </j-page-container>
</template>
<style scoped>
.payment-workspace {
  margin-top: 16px;
  padding: 20px;
  background: var(--panel-background, #fff);
  border: 1px solid var(--line, #f0f0f0);
  border-radius: 8px;
}
.payment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.payment-heading h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}
.payment-heading span,
small {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
}
small {
  display: block;
  margin-top: 4px;
}
.payment-house {
  padding: 0;
  max-width: 100%;
  height: auto;
  white-space: normal;
  text-align: left;
}
@media (max-width: 640px) {
  .payment-workspace {
    padding: 12px;
  }
  .payment-heading {
    align-items: flex-start;
  }
}
</style>
