<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { FundAccount, FundAction, FundEntry } from '../../../api/financeFunds'
import { useFundsWorkspace } from '../../../hooks/finance-funds/useFundsWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import FundDetail from './FundDetail.vue'
import FundEditor from './FundEditor.vue'
import FundReturnEditor from './FundReturnEditor.vue'
import FundRevokeEditor from './FundRevokeEditor.vue'
import '../FinanceCashier/cashier.css'
const { t } = useI18n()
const state = useFundsWorkspace()
const { projectId, table, type, terms, params, request, open, loading, failed, detail, select, close, saved, notify } =
  state
const { draft, pending, failed: recoveryFailed, recover, start, close: closeEditor } = state.flow
const {
  draft: returnDraft,
  pending: returnPending,
  failed: returnFailed,
  recover: recoverReturn,
  close: closeReturn
} = state.returns
const {
  draft: revokeDraft,
  pending: revokePending,
  failed: revokeFailed,
  recover: recoverRevoke,
  close: closeRevoke
} = state.revocations
const fields = computed(() =>
  ['fullName', 'customerName', 'subjectName', 'companyName'].map((key) => ({
    title: t(key === 'companyName' ? 'Cashier.company' : 'Receivable.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', scopedSlots: true, width: 250 },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 130 },
  { title: t('Funds.type'), dataIndex: 'type', scopedSlots: true, width: 110 },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 160 },
  { title: t('Funds.balance'), dataIndex: 'balance', scopedSlots: true, width: 140, align: 'right' },
  { title: t('Cashier.company'), dataIndex: 'companyName', width: 200 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 330, fixed: 'right' }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
function operate(action: FundAction, account: FundAccount) {
  start({ action, type: account.type, account })
}
function disabled(row: FundAccount) {
  return (
    pending.value ||
    recoveryFailed.value ||
    returnPending.value ||
    returnFailed.value ||
    revokePending.value ||
    revokeFailed.value ||
    !/[1-9]/.test(row.balance)
  )
}
function returnOffset(entry: FundEntry) {
  if (!detail.value || pending.value || recoveryFailed.value || revokePending.value || revokeFailed.value) return
  state.returns.start({ account: detail.value, entry })
  close()
}
function revokeTopup(entry: FundEntry) {
  if (!detail.value || pending.value || recoveryFailed.value || returnPending.value || returnFailed.value) return
  state.revocations.start({ account: detail.value, entry })
  close()
}
</script>
<template>
  <j-page-container>
    <ProjectScopeBar />
    <section class="funds-workspace">
      <div class="funds-heading">
        <div>
          <h2>{{ t('Funds.title') }}</h2>
          <span>{{ t('Funds.hint') }}</span>
        </div>
        <a-button
          :disabled="!projectId"
          :aria-label="t('Finance.refresh')"
          @click="table?.reload()"
        >
          <AIcon type="ReloadOutlined" />
        </a-button>
      </div>
      <a-alert
        v-if="pending"
        type="warning"
        show-icon
        :message="t('Funds.pending')"
      >
        <template #action>
          <a-button @click="recover">{{ t('Cashier.retry') }}</a-button>
        </template>
      </a-alert>
      <a-alert
        v-if="returnPending"
        type="warning"
        show-icon
        :message="t('FundReturn.pending')"
      >
        <template #action>
          <a-button
            type="link"
            @click="recoverReturn"
          >
            {{ t('Cashier.retry') }}
          </a-button>
        </template>
      </a-alert>
      <a-alert
        v-if="revokePending"
        type="warning"
        show-icon
        :message="t('FundRevoke.pending')"
      >
        <template #action>
          <j-permission-button
            hasPermission="charging/FinanceFunds:revoke-topup"
            @click="recoverRevoke"
          >
            {{ t('Cashier.retry') }}
          </j-permission-button>
        </template>
      </a-alert>
      <a-tabs v-model:active-key="type">
        <a-tab-pane
          key=""
          :tab="t('Funds.all')"
        />
        <a-tab-pane
          key="ADVANCE"
          :tab="t('Funds.ADVANCE')"
        />
        <a-tab-pane
          key="DEPOSIT"
          :tab="t('Funds.DEPOSIT')"
        />
      </a-tabs>
      <ConditionFilter
        :fields="fields"
        @change="filter"
      />
      <j-pro-table
        v-if="projectId"
        ref="table"
        row-key="id"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :pagination="{ pageSize: 12 }"
        :no-pagination="false"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 1320 }"
        @request-error="notify"
      >
        <template #fullName="row">
          <a-button
            type="link"
            class="funds-house"
            @click="select(row.id)"
          >
            {{ row.fullName }}
          </a-button>
        </template>
        <template #type="row">
          <a-tag :color="row.type === 'DEPOSIT' ? 'gold' : 'blue'">{{ t('Funds.' + row.type) }}</a-tag>
        </template>
        <template #balance="row">
          <strong class="cashier-money">{{ row.balance }}</strong>
        </template>
        <template #actions="row">
          <a-space :size="0">
            <a-button
              type="link"
              @click="select(row.id)"
            >
              {{ t('Funds.history') }}
            </a-button>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceFunds:refund"
              :disabled="disabled(row)"
              @click="operate('REFUND', row)"
            >
              {{ t('Funds.REFUND') }}
            </j-permission-button>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceFunds:transfer"
              :disabled="disabled(row)"
              @click="operate('TRANSFER', row)"
            >
              {{ t('Funds.TRANSFER') }}
            </j-permission-button>
            <j-permission-button
              v-if="row.type === 'DEPOSIT'"
              type="link"
              hasPermission="charging/FinanceFunds:deduct"
              :disabled="disabled(row)"
              @click="operate('DEDUCT', row)"
            >
              {{ t('Funds.DEDUCT') }}
            </j-permission-button>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceFunds:offset"
              :disabled="disabled(row)"
              @click="operate('OFFSET', row)"
            >
              {{ t('Funds.OFFSET') }}
            </j-permission-button>
          </a-space>
        </template>
        <template #emptyText><CloudEmpty :description="t('Funds.empty')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectContext.choose')"
      />
    </section>
    <JlDrawerShell
      v-if="open"
      :open="true"
      :width="1100"
      :title="t('Funds.history')"
      icon="WalletOutlined"
      @update:open="close"
    >
      <a-spin :spinning="loading">
        <FundDetail
          v-if="detail"
          :project-id="projectId"
          :account="detail"
          :return-disabled="pending || recoveryFailed || returnPending || returnFailed || revokePending || revokeFailed"
          @return-offset="returnOffset"
          @revoke-topup="revokeTopup"
        />
        <CloudEmpty
          v-else-if="!loading"
          :description="t(failed ? 'Finance.failed' : 'Funds.empty')"
        />
      </a-spin>
      <template #foot>
        <a-button @click="close">{{ t('Finance.close') }}</a-button>
      </template>
    </JlDrawerShell>
    <FundEditor
      v-if="draft"
      :project-id="projectId"
      :draft="draft"
      @close="closeEditor"
      @saved="saved"
    />
    <FundReturnEditor
      v-if="returnDraft"
      :project-id="projectId"
      :draft="returnDraft"
      @close="closeReturn"
      @saved="saved"
    />
    <FundRevokeEditor
      v-if="revokeDraft"
      :project-id="projectId"
      :draft="revokeDraft"
      @close="closeRevoke"
      @saved="saved"
    />
  </j-page-container>
</template>
<style scoped src="./funds.css"></style>
