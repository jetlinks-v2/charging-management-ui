<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import type { useReceivableChangeAudit } from '../../../hooks/finance-receivable/useReceivableChangeAudit'
import type { AdjustmentInput } from '../../../api/financeReceivable'
const props = defineProps<{ state: ReturnType<typeof useReceivableChangeAudit> }>()
const { t } = useI18n()
const { detail, loading, failed, busy, decision, reason, start, submit, closeDetail } = props.state
const record = computed(() => detail.value?.record)
const fields = [
  'contractReceivableAmount',
  'accruedReceivableAmount',
  'adjustmentAmount',
  'assessmentAmount',
  'temporaryDispatchAmount',
  'feeReductionAmount',
  'accruedLateFeeAmount',
  'lateFeeReductionAmount',
  'finalLateFeeAmount',
  'actualReceivableAmount',
  'arrears'
]
const changes = computed(() =>
  fields.map((key) => ({ key, before: detail.value?.preview.before?.[key], after: detail.value?.preview.after?.[key] }))
)
const adjustment = computed(() => detail.value?.input as AdjustmentInput | undefined)
const evidence = computed(() => Object.values(adjustment.value?.attachmentNames || {}).join('、') || '—')
const files = computed(() =>
  (adjustment.value?.attachmentFileIds || []).map((id) => ({
    uid: id,
    name: adjustment.value?.attachmentNames?.[id] || t('Adjustment.evidence'),
    status: 'done' as const,
    response: { result: { id } }
  }))
)
const formula = computed(() =>
  Object.entries(adjustment.value?.formulaLine?.afterVariableValues || {}).map(([key, value]) => ({ key, value }))
)
const date = (value?: number) => (value ? formatFinanceTime(value) : '—')
</script>
<template>
  <a-modal
    :open="true"
    :title="t('ChangeAudit.inspect')"
    :width="960"
    :mask-closable="false"
    :closable="!busy"
    :keyboard="!busy"
    @cancel="closeDetail"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 10 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <div
      v-else-if="detail && record"
      class="change-review-content"
    >
      <div class="change-review-heading">
        <strong>{{ record.fullName }}</strong>
        <a-tag :color="record.status === 'APPROVED' ? 'green' : record.status === 'REJECTED' ? 'red' : 'processing'">
          {{ t('ChangeAudit.status.' + record.status) }}
        </a-tag>
      </div>
      <KvGrid
        :items="[
          { label: t('ChangeAudit.operationLabel'), value: t('ChangeAudit.operation.' + record.operation) },
          { label: t('Setting.customer'), value: record.customerName },
          { label: t('Setting.subject'), value: record.subjectName },
          { label: t('Setting.standard'), value: detail.before.standardName },
          { label: t('ChangeAudit.applicant'), value: record.applicantName },
          { label: t('ChangeAudit.appliedAt'), value: date(record.createTime) },
          { label: t('Receivable.calcStartDate'), value: detail.before.calcStartDate },
          { label: t('Receivable.calcEndDate'), value: detail.before.calcEndDate }
        ]"
      />
      <section class="change-review-section">
        <h4>{{ t('ChangeAudit.content') }}</h4>
        <template v-if="record.operation === 'ADJUST'">
          <KvGrid
            :items="[
              {
                label: t('Adjustment.method'),
                value: t(adjustment?.adjustmentMode === 'FORMULA' ? 'Adjustment.formula' : 'Adjustment.direct')
              },
              { label: t('Adjustment.delta'), value: detail.preview.delta },
              { label: t('Receivable.calculatedAsOfDate'), value: adjustment?.calculationAsOfDate || '—' },
              { label: t('Adjustment.lateReason'), value: adjustment?.lateFeeReductionReason || '—' }
            ]"
          />
          <div
            v-if="adjustment?.adjustmentMode === 'FORMULA'"
            class="change-review-formula"
          >
            <p>{{ detail.before.snapshot?.standard.formulaDisplay }}</p>
            <span>{{ adjustment.formulaLine.afterCalcStartDate }} ~ {{ adjustment.formulaLine.afterCalcEndDate }}</span>
            <a-tag
              v-for="item in formula"
              :key="item.key"
            >
              {{
                detail.before.snapshot?.standard.variablesSnapshot.find((row) => row.variableCode === item.key)
                  ?.variableName || item.key
              }}：{{ item.value }}
            </a-tag>
          </div>
          <a-table
            size="small"
            row-key="key"
            :data-source="changes"
            :pagination="false"
            :columns="[
              { title: t('ChangeAudit.amount'), dataIndex: 'key' },
              { title: t('Adjustment.before'), dataIndex: 'before', align: 'right' },
              { title: t('Adjustment.after'), dataIndex: 'after', align: 'right' }
            ]"
          >
            <template #bodyCell="{ column, record: item }">
              <template v-if="column.dataIndex === 'key'">{{ t('Receivable.' + item.key) }}</template>
            </template>
          </a-table>
        </template>
        <template v-else>
          <a-table
            size="small"
            row-key="start"
            :data-source="detail.preview.parts || []"
            :pagination="false"
            :columns="[
              { title: t('Receivable.calcStartDate'), dataIndex: 'start' },
              { title: t('Receivable.calcEndDate'), dataIndex: 'end' },
              { title: t('Setting.customer'), dataIndex: 'customerName' },
              { title: t('Receivable.actualReceivableAmount'), dataIndex: 'amount', align: 'right' }
            ]"
          />
          <p class="change-review-total">{{ t('Split.total') }}：{{ detail.preview.total }}</p>
        </template>
      </section>
      <section class="change-review-section">
        <h4>{{ t('Adjustment.evidence') }}</h4>
        <p class="change-review-text">{{ record.reason }}</p>
        <KvGrid
          v-if="record.operation === 'ADJUST'"
          :items="[
            { label: t('Setting.remark'), value: adjustment?.remark || '—' },
            { label: t('Adjustment.attachments'), value: evidence }
          ]"
        />
        <FileUpload
          v-if="record.operation === 'ADJUST' && files.length"
          :value="files"
          disabled
          :is-upload="false"
        >
          <span />
        </FileUpload>
      </section>
      <section
        v-if="record.reviewedAt"
        class="change-review-section"
      >
        <h4>{{ t('ChangeAudit.result') }}</h4>
        <KvGrid
          :items="[
            { label: t('HistoricalAudit.reviewedName'), value: record.reviewedName || '—' },
            { label: t('HistoricalAudit.reviewedAt'), value: date(record.reviewedAt) },
            { label: t('HistoricalAudit.reason'), value: record.reviewReason || '—' }
          ]"
        />
      </section>
    </div>
    <template #footer>
      <a-button
        :disabled="busy"
        @click="closeDetail"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="record?.status === 'PENDING' && !loading && !failed">
        <j-permission-button
          :hasPermission="'charging/FinanceReceivable:reject'"
          danger
          :disabled="busy"
          @click="start('reject')"
        >
          {{ t('HistoricalAudit.reject') }}
        </j-permission-button>
        <j-permission-button
          :hasPermission="'charging/FinanceReceivable:approve'"
          type="primary"
          :disabled="busy"
          @click="start('approve')"
        >
          {{ t('HistoricalAudit.approve') }}
        </j-permission-button>
      </template>
    </template>
  </a-modal>
  <a-modal
    :open="!!decision"
    :title="t('HistoricalAudit.' + (decision || 'approve'))"
    :width="560"
    :mask-closable="false"
    :closable="!busy"
    :keyboard="!busy"
    :confirm-loading="busy"
    :ok-text="t('HistoricalAudit.submit')"
    :ok-button-props="{ danger: decision === 'reject', disabled: !reason.trim() }"
    :cancel-button-props="{ disabled: busy }"
    @cancel="decision = undefined"
    @ok="submit"
  >
    <p>{{ record?.fullName }} · {{ t('ChangeAudit.operation.' + record?.operation) }}</p>
    <a-form layout="vertical">
      <a-form-item
        required
        :label="t('HistoricalAudit.reason')"
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy"
          :maxlength="1000"
          :rows="4"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.change-review-content {
  max-height: 65vh;
  overflow: auto;
  padding-right: 8px;
}
.change-review-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.change-review-heading strong {
  font-size: 16px;
  overflow-wrap: anywhere;
}
.change-review-section {
  margin-top: 24px;
}
.change-review-section h4 {
  margin-bottom: 12px;
  font-weight: 600;
}
.change-review-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.change-review-total {
  text-align: right;
  font-weight: 600;
  margin-top: 12px;
  font-variant-numeric: tabular-nums;
}
.change-review-formula {
  margin-bottom: 16px;
  line-height: 2;
}
.change-review-formula span {
  margin-right: 12px;
}
</style>
