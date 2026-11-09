<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FundAccount, FundEntry } from '../../../api/financeFunds'
import { useFundHistory } from '../../../hooks/finance-funds/useFundHistory'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; account: FundAccount; returnDisabled?: boolean; permission?: string }>()
const emit = defineEmits<{ returnOffset: [entry: FundEntry]; revokeTopup: [entry: FundEntry] }>()
const { t } = useI18n(),
  { selected, params, request } = useFundHistory(props)
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
const columns = computed(() => [
  { title: t('Document.billNo'), dataIndex: 'billNo', width: 280 },
  { title: t('Funds.occurredAt'), dataIndex: 'occurredAt', scopedSlots: true, width: 190 },
  { title: t('Funds.action'), dataIndex: 'action', scopedSlots: true, width: 110 },
  { title: t('Funds.change'), dataIndex: 'amount', width: 130, align: 'right' },
  { title: t('Funds.after'), dataIndex: 'afterBalance', width: 140, align: 'right' },
  { title: t('Funds.cashAmount'), dataIndex: 'cashAmount', width: 130, align: 'right' },
  { title: t('Funds.payer'), dataIndex: 'payerName', width: 130 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 200, fixed: 'right' }
])
const summary = computed(() => [
  { label: t('Setting.house'), value: props.account.fullName },
  { label: t('Setting.customer'), value: props.account.customerName },
  { label: t('Funds.type'), value: t('Funds.' + props.account.type) },
  { label: t('Funds.balance'), value: props.account.balance },
  { label: t('Setting.subject'), value: props.account.subjectName },
  { label: t('Setting.standard'), value: props.account.standardName },
  { label: t('Cashier.company'), value: props.account.companyName }
])
</script>
<template>
  <div class="cashier-editor">
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Funds.accountInfo')"
    >
      <KvGrid
        :cols="2"
        :items="summary"
      />
    </SectionCard>
    <SectionCard
      icon="UnorderedListOutlined"
      :title="t('Funds.history')"
    >
      <j-pro-table
        row-key="id"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :pagination="{ pageSize: 8 }"
        :no-pagination="false"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 930 }"
        @request-error="notify"
      >
        <template #occurredAt="row">{{ formatFinanceTime(row.occurredAt) }}</template>
        <template #action="row">{{ t('Funds.' + row.action) }}</template>
        <template #actions="row">
          <a-button
            type="link"
            @click="selected = row"
          >
            {{ t('Finance.detail') }}
          </a-button>
          <j-permission-button
            v-if="row.action === 'OFFSET'"
            type="link"
            :hasPermission="`${permission || 'charging/FinanceFunds'}:return-offset`"
            :disabled="returnDisabled"
            @click="emit('returnOffset', row)"
          >
            {{ t('FundReturn.title') }}
          </j-permission-button>
          <j-permission-button
            v-if="row.action === 'TOPUP' && account.type === 'ADVANCE'"
            type="link"
            :hasPermission="`${permission || 'charging/FinanceFunds'}:revoke-topup`"
            :disabled="returnDisabled"
            @click="emit('revokeTopup', row)"
          >
            {{ t('FundRevoke.title') }}
          </j-permission-button>
        </template>
        <template #emptyText><CloudEmpty :description="t('Funds.emptyHistory')" /></template>
      </j-pro-table>
    </SectionCard>
    <JlDrawerShell
      v-if="selected"
      :open="true"
      :width="650"
      icon="FileTextOutlined"
      :title="t('Funds.operationInfo')"
      @update:open="selected = undefined"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Document.billNo'), value: selected.billNo },
          { label: t('Funds.action'), value: t('Funds.' + selected.action) },
          { label: t('Funds.change'), value: selected.amount },
          { label: t('Funds.cashAmount'), value: selected.cashAmount },
          { label: t('Funds.before'), value: selected.beforeBalance },
          { label: t('Funds.after'), value: selected.afterBalance },
          { label: t('Funds.occurredAt'), value: formatFinanceTime(selected.occurredAt) },
          { label: t('Funds.payer'), value: selected.payerName },
          { label: t('Cashier.method'), value: selected.methodText },
          { label: t('Cashier.bank'), value: selected.bankName || '—' },
          { label: t('Cashier.operator'), value: selected.modifierName || '—' },
          { label: t('Funds.reason'), value: selected.reason }
        ]"
      />
      <template #foot>
        <a-button @click="selected = undefined">{{ t('Finance.close') }}</a-button>
      </template>
    </JlDrawerShell>
  </div>
</template>
