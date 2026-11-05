<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { DocumentType } from '../../../api/financeDocument'
import type { Query } from '../../../api/archive'
import { useDocumentWorkspace } from '../../../hooks/finance-document/useDocumentWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import DocumentEditor from './DocumentEditor.vue'
import DocumentDetail from './DocumentDetail.vue'
import DocumentReverse from './DocumentReverse.vue'
import DocumentReopen from './DocumentReopen.vue'
import DocumentRowActions from './DocumentRowActions.vue'
import ReceiptVerification from './ReceiptVerification.vue'
import './document.css'
const props = defineProps<{ type: DocumentType }>()
const { t } = useI18n()
const screens = Grid.useBreakpoint()
const state = useDocumentWorkspace(props.type)
const {
  projectId,
  verification,
  permission,
  table,
  terms,
  status,
  params,
  request,
  notify,
  issueOpen,
  detailOpen,
  reverseOpen,
  reverseTarget,
  issuePending,
  reversePending,
  reopenOpen,
  reopenTarget,
  reopenPending,
  reopen,
  closeReopen,
  recoverReopen,
  recoveryFailed,
  blocked,
  start,
  closeIssue,
  closeReverse,
  saved,
  reverse,
  recoverReverse,
  select
} = state
const statuses =
  props.type === 'INVOICE' ? ['SIMULATED_ISSUED', 'SIMULATED_REVERSED', 'SIMULATED_RED'] : ['ISSUED', 'VOIDED']
const fields = computed(() =>
  ['documentNumber', 'buyerName', 'customerName', 'companyName'].map((key) => ({
    title: t('Document.fields.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
const columns = computed(() => [
  { title: t('Document.number'), dataIndex: 'number', width: 230, scopedSlots: true },
  { title: t('Document.state'), dataIndex: 'status', width: 140, scopedSlots: true },
  ...(props.type === 'RECEIPT'
    ? [{ title: t('Verification.state'), dataIndex: 'verified', width: 110, scopedSlots: true }]
    : []),
  { title: t('Document.buyer.name'), dataIndex: 'buyerName', width: 170 },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 140 },
  { title: t('Document.seller'), dataIndex: 'companyName', width: 190 },
  { title: t('Document.total'), dataIndex: 'amount', width: 140, align: 'right', scopedSlots: true },
  { title: t('Document.issuedAt'), dataIndex: 'issuedAt', width: 180, scopedSlots: true },
  {
    title: t('Finance.actions'),
    dataIndex: 'actions',
    width: 260,
    fixed: screens.value.md ? 'right' : undefined,
    scopedSlots: true
  }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
const selection = computed(() =>
  props.type !== 'RECEIPT'
    ? undefined
    : {
        selectedRowKeys: verification.selected.value.map((row) => row.id),
        preserveSelectedRowKeys: true,
        onChange: verification.changed,
        getCheckboxProps: (row: import('../../../api/financeDocument').DocumentRecord) => ({
          disabled: blocked.value || row.status !== 'ISSUED' || !!row.verified
        })
      }
)
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <section class="document-workspace">
      <div class="document-toolbar">
        <a-radio-group
          v-model:value="status"
          :aria-label="t('Document.state')"
        >
          <a-radio-button value="ALL">{{ t('Document.all') }}</a-radio-button>
          <a-radio-button
            v-for="value in statuses"
            :key="value"
            :value="value"
          >
            {{ t('Document.status.' + value) }}
          </a-radio-button>
        </a-radio-group>
        <a-space>
          <j-permission-button
            v-if="type === 'RECEIPT'"
            hasPermission="charging/FinanceReceipt:verify"
            :disabled="blocked || !verification.selected.value.length"
            @click="verification.start(verification.selected.value)"
          >
            {{ t('Verification.batch', { count: verification.selected.value.length }) }}
          </j-permission-button>
          <j-permission-button
            type="primary"
            :hasPermission="permission + ':create'"
            :disabled="!projectId || blocked"
            @click="start"
          >
            <AIcon type="PlusOutlined" />
            {{ t(type === 'INVOICE' ? 'Document.newInvoice' : 'Document.newReceipt') }}
          </j-permission-button>
          <a-button
            :disabled="!projectId"
            :aria-label="t('Finance.refresh')"
            @click="table?.reload()"
          >
            <AIcon type="ReloadOutlined" />
          </a-button>
        </a-space>
      </div>
      <a-alert
        v-if="
          issuePending ||
          reversePending ||
          reopenPending ||
          recoveryFailed ||
          verification.pending.value ||
          verification.failed.value
        "
        type="warning"
        show-icon
        :message="t(recoveryFailed || verification.failed.value ? 'Document.recoveryUnavailable' : 'Document.pending')"
      >
        <template #action>
          <j-permission-button
            v-if="verification.pending.value"
            hasPermission="charging/FinanceReceipt:verify"
            @click="verification.recover"
          >
            {{ t('Verification.recover') }}
          </j-permission-button>
          <j-permission-button
            v-if="issuePending"
            :hasPermission="permission + ':create'"
            @click="issueOpen = true"
          >
            {{ t('Document.recoverIssue') }}
          </j-permission-button>
          <j-permission-button
            v-if="reopenPending"
            :hasPermission="permission + ':reopen'"
            @click="recoverReopen"
          >
            {{ t('Document.recoverReopen') }}
          </j-permission-button>
          <j-permission-button
            v-if="reversePending"
            :hasPermission="permission + (type === 'INVOICE' ? ':reverse' : ':void')"
            @click="recoverReverse"
          >
            {{ t('Document.recoverReverse') }}
          </j-permission-button>
        </template>
      </a-alert>
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
        :row-selection="selection"
        :request="request"
        :no-pagination="false"
        :pagination="{ pageSize: 12 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: type === 'RECEIPT' ? 1600 : 1350 }"
        @request-error="notify"
      >
        <template #number="row">
          <a-button
            type="link"
            class="document-number"
            @click="select(row.id)"
          >
            {{ row.documentNumber }}
          </a-button>
        </template>
        <template #status="row">
          <a-tag :color="row.status === 'SIMULATED_RED' || row.status === 'VOIDED' ? 'default' : 'processing'">
            {{ t('Document.status.' + row.status) }}
          </a-tag>
        </template>
        <template #amount="row">
          <strong class="document-money">{{ row.amount }}</strong>
        </template>
        <template #verified="row">
          <a-tag :color="row.verified ? 'success' : 'default'">
            {{ t(row.verified ? 'Verification.verified' : 'Verification.unverified') }}
          </a-tag>
        </template>
        <template #issuedAt="row">{{ row.issuedAt.replace('T', ' ') }}</template>
        <template #actions="row">
          <DocumentRowActions
            :row="row"
            :type="type"
            :blocked="blocked"
            @detail="select(row.id)"
            @reverse="reverse(row)"
            @reopen="reopen(row)"
            @verify="verification.start([row])"
          />
        </template>
        <template #emptyText><CloudEmpty :description="t('Document.empty')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectContext.choose')"
      />
    </section>
    <DocumentEditor
      v-if="issueOpen"
      :project-id="projectId"
      :type="type"
      @close="closeIssue"
      @saved="saved"
    />
    <DocumentDetail
      v-if="detailOpen"
      :state="state"
    />
    <DocumentReverse
      v-if="reverseOpen && reverseTarget"
      :project-id="projectId"
      :document="reverseTarget"
      @close="closeReverse"
      @saved="saved"
    />
    <DocumentReopen
      v-if="reopenOpen && reopenTarget"
      :project-id="projectId"
      :document="reopenTarget"
      @close="closeReopen"
      @saved="saved"
    />
    <ReceiptVerification
      v-if="verification.open.value"
      :project-id="projectId"
      :documents="verification.targets.value"
      @close="verification.close"
      @saved="saved"
    />
  </FinancePage>
</template>
