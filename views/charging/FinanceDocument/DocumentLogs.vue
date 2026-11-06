<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { DocumentRecord } from '../../../api/financeDocument'
import { useDocumentLogs } from '../../../hooks/finance-document/useDocumentLogs'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; document: DocumentRecord }>()
const { t } = useI18n(),
  { request } = useDocumentLogs(props)
const columns = computed(() => [
  { title: t('Document.operation'), dataIndex: 'action', width: 120, scopedSlots: true },
  { title: t('Document.state'), dataIndex: 'state', width: 150, scopedSlots: true },
  { title: t('Document.reason'), dataIndex: 'reason', width: 230 },
  { title: t('Cashier.operator'), dataIndex: 'modifierName', width: 130 },
  { title: t('Document.operationTime'), dataIndex: 'createTime', width: 180, scopedSlots: true }
])
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
</script>
<template>
  <SectionCard
    icon="HistoryOutlined"
    :title="t('Document.logs')"
  >
    <j-pro-table
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :request="request"
      :params="{ documentId: document.id }"
      :no-pagination="false"
      :pagination="{ pageSize: 10 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      :scroll="{ x: 810 }"
      @request-error="notify"
    >
      <template #action="row">
        {{
          t(
            row.action === 'ISSUE'
              ? 'Document.issued'
              : row.action === 'VERIFY'
                ? 'Verification.verify'
                : row.action === 'REOPEN'
                  ? 'Document.reopen'
                  : document.documentType === 'INVOICE'
                    ? 'Document.reverse'
                    : 'Document.void'
          )
        }}
      </template>
      <template #state="row">
        <a-tag>{{ t('Document.status.' + row.afterState) }}</a-tag>
      </template>
      <template #createTime="row">{{ formatFinanceTime(row.createTime) }}</template>
      <template #emptyText><CloudEmpty :description="t('Document.noLogs')" /></template>
    </j-pro-table>
  </SectionCard>
</template>
