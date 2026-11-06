<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import FinancePage from '../components/FinancePage.vue'
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
import DocumentSettings from './DocumentSettings.vue'
import DocumentRecoveryActions from './DocumentRecoveryActions.vue'
import { useDocumentColumns } from '../../../hooks/finance-document/useDocumentColumns'
import { useDocumentFiles } from '../../../hooks/finance-document/useDocumentFiles'
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
  reopenOpen,
  reopenTarget,
  reopen,
  closeReopen,
  blocked,
  start,
  closeIssue,
  closeReverse,
  saved,
  reverse,
  select
} = state
const { exporting, exportRows } = useDocumentFiles(projectId, props.type, () => params.value)
const statuses =
  props.type === 'INVOICE' ? ['SIMULATED_ISSUED', 'SIMULATED_REVERSED', 'SIMULATED_RED'] : ['ISSUED', 'VOIDED']
const { fields, columns } = useDocumentColumns(props.type)
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <FinancePage fixed>
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
        <a-space wrap>
          <DocumentSettings
            v-if="type === 'INVOICE'"
            :type="type"
            :disabled="!projectId || blocked"
          />
          <j-permission-button
            :hasPermission="permission + ':export'"
            :disabled="!projectId"
            :loading="exporting"
            @click="exportRows('excel')"
          >
            {{ t('Document.exportLedger') }}
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
        </a-space>
      </div>
      <DocumentRecoveryActions
        :state="state"
        :type="type"
      />
      <div class="document-search">
        <ConditionFilter
          :fields="fields"
          @change="filter"
        />
      </div>
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
        :scroll="{ x: 'max-content' }"
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
        <template #business="row">
          <a-tooltip :title="row.fullName">
            <span class="document-space">{{ row.fullName || '—' }}</span>
          </a-tooltip>
          <small>{{ row.customerName }} · {{ row.subjectName }}</small>
          <small>{{ row.period }}</small>
        </template>
        <template #sourceScene="row">
          {{
            (row.sourceType || '')
              .split(' / ')
              .map((v: string) => t('Document.sourceTypes.' + v))
              .join(' / ')
          }}
          <small>{{ t('Document.scene.' + row.issueScene) }}</small>
        </template>
        <template #collection="row">
          {{ t('Document.paymentStates.' + (row.paymentStatus || 'UNKNOWN')) }}
          <small class="document-money">{{ row.paidAmount ?? '—' }}</small>
        </template>
        <template #taxSnapshot="row">
          <span
            v-for="(line, i) in row.sources || []"
            :key="i"
          >
            {{ line.goodsName }} · {{ line.taxRate }} · {{ t('Document.method.' + line.collectionMethod) }}
            <br />
          </span>
        </template>
        <template #ruleSnapshot="row">
          {{ row.timeLimitType ? t('Document.rule.' + row.timeLimitType) : '—' }}
          <small v-if="row.limitDays">{{ t('Document.rule.limitDays') }}: {{ row.limitDays }}</small>
          <small>
            {{ t('Document.rule.maxReopenTimes') }}: {{ row.maxReopenTimes ?? t('Document.rule.unlimited') }}
          </small>
        </template>
        <template #amount="row">
          <strong class="document-money">{{ row.amount }}</strong>
        </template>
        <template #issuedAt="row">{{ formatFinanceTime(row.issuedAt) }}</template>
        <template #actions="row">
          <DocumentRowActions
            :row="row"
            :type="type"
            :blocked="blocked"
            @detail="select(row.id)"
            @reverse="reverse(row)"
            @reopen="reopen(row)"
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
  </FinancePage>
</template>
