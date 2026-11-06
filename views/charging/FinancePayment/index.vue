<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { usePaymentColumns } from '../../../hooks/finance-cashier/usePaymentColumns'
import { collectionTypeColors, handoverStateColors } from '../../../utils/collectionDisplay'
import FinancePage from '../components/FinancePage.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { PaymentRecord } from '../../../api/financeCashier'
import { usePaymentRecords } from '../../../hooks/finance-cashier/usePaymentRecords'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import PaymentSummary from '../FinanceCashier/PaymentSummary.vue'
import PaymentRefundActions from './PaymentRefundActions.vue'
import { useRefundFlow } from '../../../hooks/finance-cashier/useRefundFlow'
import { usePaymentToAdvanceFlow } from '../../../hooks/finance-cashier/usePaymentToAdvanceFlow'
import PaymentAdvanceEditor from './PaymentAdvanceEditor.vue'
import { refundableMoney } from '../../../utils/refundMoney'
import '../FinanceCashier/cashier.css'
import FinanceLedgerSpace from '../components/FinanceLedgerSpace.vue'
import ReceivedLedger from './ReceivedLedger.vue'
const ledgerTab = ref('cash')
const props = defineProps<{ temporary?: boolean }>()
const { t } = useI18n()
const refundPermission = props.temporary ? 'charging/FinanceTemporary:refund' : 'charging/FinancePayment:refund'
const { archive, projectId, table, terms, params, open, loading, failed, detail, request, select, close, notify } =
  usePaymentRecords(props.temporary)
const refund = useRefundFlow(projectId, () => table.value?.reload())
const advance = usePaymentToAdvanceFlow(projectId, () => {
  refund.selected.value = []
  table.value?.reload()
})
const advancePermission = props.temporary
  ? 'charging/FinanceTemporary:to-advance'
  : 'charging/FinancePayment:to-advance'
const advanceBusy = computed(() => !!advance.rows.value || advance.pending.value || advance.failed.value)
const paymentRequest: typeof request = (query, config) => {
  refund.selected.value = []
  return request(query, config)
}
const rowKey = (row: PaymentRecord) => row.line.id
const { fields, columns } = usePaymentColumns(props.temporary)
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <FinancePage
    fixed
    collection
  >
    <ProjectScopeBar />
    <div class="payment-ledger-layout">
      <FinanceLedgerSpace :state="archive" />
      <section class="payment-workspace">
        <div
          v-if="temporary"
          class="payment-heading"
        >
          <div>
            <h2>{{ t(temporary ? 'Temporary.title' : 'Cashier.records') }}</h2>
            <span>{{ t(temporary ? 'Temporary.recordsHint' : 'Cashier.recordsHint') }}</span>
          </div>
        </div>
        <a-tabs
          v-if="!temporary"
          v-model:active-key="ledgerTab"
        >
          <a-tab-pane
            key="cash"
            :tab="t('Cashier.receivedLedger')"
          />
          <a-tab-pane
            key="original"
            :tab="t('Cashier.originalPayments')"
          />
        </a-tabs>
        <ReceivedLedger
          v-if="!temporary && ledgerTab === 'cash' && projectId"
          :archive="archive"
        />
        <template v-else-if="projectId">
          <PaymentRefundActions
            :project-id="projectId"
            :state="refund"
            :permission="refundPermission"
            :disabled="advanceBusy"
          >
            <j-permission-button
              :hasPermission="advancePermission"
              :disabled="
                advanceBusy ||
                refund.pending.value ||
                refund.failed.value ||
                !!refund.rows.value ||
                refund.selected.value.length > 100
              "
              @click="advance.start(refund.selected.value)"
            >
              <AIcon type="SwapOutlined" />
              {{ t('PaymentAdvance.title') }}
            </j-permission-button>
          </PaymentRefundActions>
          <a-alert
            v-if="advance.pending.value"
            type="warning"
            show-icon
            :message="t('PaymentAdvance.pending')"
          >
            <template #action>
              <j-permission-button
                :hasPermission="advancePermission"
                @click="advance.recover"
              >
                {{ t('Cashier.retry') }}
              </j-permission-button>
            </template>
          </a-alert>
          <ConditionFilter
            class="collection-filter"
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
            :request="paymentRequest"
            :row-selection="refund.selection.value"
            :no-pagination="false"
            :pagination="{ pageSize: 12 }"
            :alert-show="false"
            :body-style="{ padding: 0 }"
            :scroll="{ x: 1390 }"
            @request-error="notify"
          >
            <template #paidAt="row">{{ formatFinanceTime(row.paidAt) }}</template>
            <template #handoverState="row">
              <a-tag
                v-if="row.handoverState"
                :color="handoverStateColors[row.handoverState]"
              >
                {{ t('Received.handover.' + row.handoverState) }}
              </a-tag>
              <span v-else>—</span>
            </template>
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
              <a-tag
                :color="collectionTypeColors.TEMPORARY"
                v-if="!temporary && row.line.sourceType === 'TEMPORARY'"
              >
                {{ t('Temporary.source') }}
              </a-tag>
              <small>{{ row.line.customerName }}</small>
            </template>
            <template #method="row">
              {{ row.line.methodText }}
              <small>{{ row.line.bankName || '—' }}</small>
            </template>
            <template #amount="row">
              <strong class="cashier-money">{{ row.line.amount }}</strong>
            </template>
            <template #available="row">
              {{ refundableMoney(row.line) }}
              <small>{{ t('Cashier.refunded') }} {{ row.line.refundedAmount }}</small>
            </template>
            <template #actions="row">
              <a-button
                type="link"
                @click="select(row.line.paymentId)"
              >
                {{ t('Finance.detail') }}
              </a-button>
              <j-permission-button
                type="link"
                :hasPermission="refundPermission"
                :disabled="
                  advanceBusy || refund.pending.value || refund.failed.value || refundableMoney(row.line) === '0.00'
                "
                @click="refund.start([row])"
              >
                {{ t('Refund.start') }}
              </j-permission-button>
            </template>
            <template #emptyText><CloudEmpty :description="t('Cashier.noPayments')" /></template>
          </j-pro-table>
        </template>
        <CloudEmpty
          v-else
          :description="t('ProjectContext.choose')"
        />
      </section>
    </div>
    <PaymentAdvanceEditor
      v-if="advance.rows.value"
      :project-id="projectId"
      :rows="advance.rows.value"
      @close="advance.close"
      @saved="advance.saved"
    />
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
  </FinancePage>
</template>
<style scoped src="./index.css"></style>
