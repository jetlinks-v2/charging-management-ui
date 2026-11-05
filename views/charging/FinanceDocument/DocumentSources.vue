<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentCandidates } from '../../../hooks/finance-document/useDocumentCandidates'
import type { useDocumentEditor } from '../../../hooks/finance-document/useDocumentEditor'
import type { DocumentType } from '../../../api/financeDocument'
import { canSelectDocument, documentSourceKey } from '../../../utils/documentSelection'
const props = defineProps<{ projectId: string; type: DocumentType; state: ReturnType<typeof useDocumentEditor> }>()
const { t } = useI18n()
const { selected, toggle, notify } = props.state
const { sourceType, keywords, params, request } = useDocumentCandidates(props, selected)
const columns = computed(() => [
  { title: t('Document.select'), dataIndex: 'select', width: 68, scopedSlots: true },
  { title: t('Setting.house'), dataIndex: 'house', width: 220, scopedSlots: true },
  { title: t('Setting.subject'), dataIndex: 'subject', width: 180, scopedSlots: true },
  { title: t('Document.seller'), dataIndex: 'companyName', width: 180 },
  { title: t('Document.standard'), dataIndex: 'standardName', width: 150 },
  { title: t('Document.taxRate'), dataIndex: 'taxRate', width: 110 },
  { title: t('Document.goodsCode'), dataIndex: 'goodsCode', width: 150 },
  { title: t('Document.paidAmount'), dataIndex: 'paidAmount', width: 130, align: 'right' },
  { title: t('Document.available'), dataIndex: 'available', width: 160, align: 'right', scopedSlots: true }
])
const reason = (code?: string) => (code ? t(code) : t('Document.sourceUnavailable'))
</script>
<template>
  <div class="document-source-filters">
    <a-radio-group
      v-model:value="sourceType"
      :aria-label="t('Document.source')"
    >
      <a-radio-button value="RECEIVABLE">{{ t('Document.sourceReceivable') }}</a-radio-button>
      <a-radio-button value="TEMP_PAYMENT">{{ t('Document.sourceTemporary') }}</a-radio-button>
      <a-radio-button value="FUND_TOPUP">{{ t('Document.sourceFund') }}</a-radio-button>
    </a-radio-group>
    <a-input-search
      :placeholder="t('Document.searchSource')"
      allow-clear
      @search="(value) => (keywords = value)"
    />
  </div>
  <j-pro-table
    row-key="sourceId"
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
    <template #select="row">
      <a-checkbox
        :aria-label="t('Document.selectSource', { name: row.fullName, subject: row.subjectName })"
        :checked="selected.some((v) => documentSourceKey(v) === documentSourceKey(row))"
        :disabled="!canSelectDocument(row, selected)"
        @change="toggle(row)"
      />
    </template>
    <template #house="row">
      {{ row.fullName }}
      <small>{{ row.customerName }}</small>
    </template>
    <template #subject="row">
      {{ row.subjectName }}
      <small v-if="row.sourceType === 'FUND_TOPUP'">
        {{ t(row.fundType === 'DEPOSIT' ? 'Document.sourceDeposit' : 'Document.sourceAdvance') }}
        · {{ row.paidAt?.replace('T', ' ') || '—' }}
      </small>
      <small v-else>{{ row.startDate || '—' }} ～ {{ row.endDate || '—' }}</small>
    </template>
    <template #available="row">
      <strong class="document-money">{{ row.availableAmount }}</strong>
      <small v-if="!row.selectable">{{ reason(row.unavailableCode) }}</small>
    </template>
    <template #emptyText><CloudEmpty :description="t('Document.noSources')" /></template>
  </j-pro-table>
  <div
    v-if="selected.length"
    class="document-selected"
  >
    <span>{{ t('Document.selected', { count: selected.length }) }}</span>
    <a-tag
      v-for="row in selected"
      :key="documentSourceKey(row)"
      closable
      @close.prevent="toggle(row)"
    >
      {{ row.fullName }} · {{ row.subjectName }}
    </a-tag>
  </div>
</template>
