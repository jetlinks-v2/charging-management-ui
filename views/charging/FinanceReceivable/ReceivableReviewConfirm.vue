<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Receivable, ReceivableReviewAction } from '../../../api/financeReceivable'
import { useReviewConfirmation } from '../../../hooks/finance-receivable/useReceivableReview'
const props = defineProps<{ projectId: string; rows: Receivable[]; action: ReceivableReviewAction }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { reason, result, uncertain, failed, saving, locked, canClose, submit } = useReviewConfirmation(props, () =>
  emit('saved')
)
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t('ReceivableReview.action.' + action)"
    :width="720"
    :footer="null"
    :closable="canClose"
    :mask-closable="false"
    :keyboard="canClose"
    @cancel="close"
  >
    <a-result
      v-if="result"
      status="success"
      :title="t('ReceivableReview.done', { count: result.length })"
    />
    <template v-else>
      <a-alert
        show-icon
        :type="uncertain || failed ? 'warning' : 'info'"
        :message="
          t(
            failed ? 'Document.recoveryUnavailable' : uncertain ? 'ReceivableReview.unknown' : 'ReceivableReview.hint',
            { count: rows.length }
          )
        "
      />
      <div class="review-rows">
        <a-table
          :data-source="rows"
          :pagination="false"
          size="small"
          row-key="id"
          :scroll="{ x: 560, y: 260 }"
        >
          <a-table-column
            :title="t('Setting.house')"
            data-index="fullName"
            :width="230"
          />
          <a-table-column
            :title="t('Setting.subject')"
            data-index="subjectName"
            :width="150"
          />
          <a-table-column
            :title="t('Receivable.actualReceivableAmount')"
            data-index="actualReceivableAmount"
            :width="130"
          />
        </a-table>
      </div>
      <a-form layout="vertical">
        <a-form-item
          required
          :label="t('Receivable.reason')"
        >
          <a-textarea
            v-model:value="reason"
            :disabled="locked"
            :rows="3"
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </a-form>
    </template>
    <div class="review-footer">
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        v-if="!result && !failed"
        type="primary"
        :hasPermission="'charging/FinanceReceivable:' + action.toLowerCase()"
        :disabled="!reason.trim()"
        :loading="saving"
        @click="submit"
      >
        {{ t(uncertain ? 'Cashier.retry' : 'ReceivableReview.action.' + action) }}
      </j-permission-button>
    </div>
  </a-modal>
</template>
<style scoped>
.review-rows {
  margin: 20px 0;
}
.review-footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
</style>
