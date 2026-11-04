<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { DocumentType } from '../../../api/financeDocument'
import type { Query } from '../../../api/archive'
import { useDocumentWorkspace } from '../../../hooks/finance-document/useDocumentWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import DocumentEditor from './DocumentEditor.vue'
import DocumentDetail from './DocumentDetail.vue'
import DocumentReverse from './DocumentReverse.vue'
import './document.css'
const props = defineProps<{ type: DocumentType }>()
const { t } = useI18n()
const state = useDocumentWorkspace(props.type)
const {
  projectId,
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
  { title: t('Document.buyer.name'), dataIndex: 'buyerName', width: 170 },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 140 },
  { title: t('Document.seller'), dataIndex: 'companyName', width: 190 },
  { title: t('Document.total'), dataIndex: 'amount', width: 140, align: 'right', scopedSlots: true },
  { title: t('Document.issuedAt'), dataIndex: 'issuedAt', width: 180, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 160, fixed: 'right', scopedSlots: true }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <j-page-container>
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
        v-if="issuePending || reversePending || recoveryFailed"
        type="warning"
        show-icon
        :message="t(recoveryFailed ? 'Document.recoveryUnavailable' : 'Document.pending')"
      >
        <template #action>
          <j-permission-button
            v-if="issuePending"
            :hasPermission="permission + ':create'"
            @click="issueOpen = true"
          >
            {{ t('Document.recoverIssue') }}
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
        :request="request"
        :no-pagination="false"
        :pagination="{ pageSize: 12 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 1350 }"
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
        <template #issuedAt="row">{{ row.issuedAt.replace('T', ' ') }}</template>
        <template #actions="row">
          <a-button
            type="link"
            @click="select(row.id)"
          >
            {{ t('Finance.detail') }}
          </a-button>
          <j-permission-button
            v-if="['SIMULATED_ISSUED', 'ISSUED'].includes(row.status)"
            type="link"
            danger
            :hasPermission="permission + (type === 'INVOICE' ? ':reverse' : ':void')"
            :disabled="blocked"
            @click="reverse(row)"
          >
            {{ t(type === 'INVOICE' ? 'Document.reverse' : 'Document.void') }}
          </j-permission-button>
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
  </j-page-container>
</template>
