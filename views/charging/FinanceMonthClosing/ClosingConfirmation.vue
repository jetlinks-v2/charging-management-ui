<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store'
import type { AccountingPeriod, ClosingAction } from '../../../api/financeAccounting'
import { useClosingConfirmation } from '../../../hooks/finance-month-closing/useClosingConfirmation'
const { jumpPage } = useMenuStore()
const props = defineProps<{ projectId: string; period: AccountingPeriod; action: ClosingAction }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useClosingConfirmation(props, () => emit('saved'))
const { reason, preview, result, uncertain, failed, saving, calculating, locked, canClose, ready, calculate, submit } =
  state
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t('MonthClosing.action.' + action) + ' · ' + period.accountMonth"
    :width="640"
    :footer="null"
    :closable="canClose"
    :mask-closable="false"
    :keyboard="canClose"
    @cancel="close"
  >
    <a-result
      v-if="result"
      status="success"
      :title="t('MonthClosing.done.' + action)"
    >
      <template #subTitle>{{ result.month }} · {{ t('MonthClosing.status.' + result.status) }}</template>
    </a-result>
    <div
      v-else
      class="closing-confirm-content"
    >
      <a-alert
        show-icon
        :type="uncertain || failed ? 'warning' : 'info'"
        :message="
          t(
            failed ? 'Document.recoveryUnavailable' : uncertain ? 'MonthClosing.unknown' : 'MonthClosing.hint.' + action
          )
        "
      />
      <a-space
        style="margin: 12px 0"
        wrap
      >
        <a-button
          type="link"
          @click="jumpPage('charging/FinanceHandover')"
        >
          {{ t('Handover.details') }}
        </a-button>
        <a-button
          type="link"
          @click="jumpPage('charging/FinanceHandoverRecord')"
        >
          {{ t('Handover.records') }}
        </a-button>
        <a-button
          type="link"
          @click="jumpPage('charging/FinanceReceivable')"
        >
          {{ t('MonthClosing.pendingReceivable') }}
        </a-button>
      </a-space>
      <a-form layout="vertical">
        <a-form-item
          required
          :label="t('MonthClosing.reason')"
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
      <a-spin :spinning="calculating">
        <template v-if="preview">
          <KvGrid
            :cols="2"
            :items="[
              { label: t('MonthClosing.amount'), value: '￥' + preview.amount },
              { label: t('MonthClosing.cashAmount'), value: '￥' + preview.cashAmount },
              { label: t('MonthClosing.sourceCount'), value: preview.sourceCount },
              { label: t('MonthClosing.receivableCount'), value: preview.receivableCount }
            ]"
          />
          <a-descriptions
            v-if="action === 'CLOSE'"
            size="small"
            :column="1"
            class="closing-checks"
          >
            <a-descriptions-item :label="t('MonthClosing.unhanded')">
              <a-tag :color="preview.unhandedCount ? 'orange' : 'green'">{{ preview.unhandedCount }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item :label="t('MonthClosing.pendingHandover')">
              <a-tag :color="preview.pendingHandoverCount ? 'orange' : 'green'">
                {{ preview.pendingHandoverCount }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item :label="t('MonthClosing.pendingReceivable')">
              <a-tag :color="preview.requireReceivableReview && preview.pendingReceivableCount ? 'orange' : 'default'">
                {{ preview.pendingReceivableCount }}
              </a-tag>
              {{ t(preview.requireReceivableReview ? 'MonthClosing.reviewRequired' : 'MonthClosing.reviewOptional') }}
            </a-descriptions-item>
          </a-descriptions>
          <p
            v-if="!ready"
            class="closing-blocker"
          >
            {{ t('MonthClosing.resolveChecks') }}
          </p>
        </template>
      </a-spin>
    </div>
    <div class="closing-footer">
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        v-if="!result && !failed && !uncertain"
        :hasPermission="'charging/FinanceMonthClosing:' + action.toLowerCase()"
        :disabled="locked || !reason.trim()"
        :loading="calculating"
        @click="calculate"
      >
        {{ t('MonthClosing.check') }}
      </j-permission-button>
      <j-permission-button
        v-if="!result && !failed"
        type="primary"
        :danger="action === 'REOPEN'"
        :hasPermission="'charging/FinanceMonthClosing:' + action.toLowerCase()"
        :disabled="!uncertain && (!ready || calculating)"
        :loading="saving"
        @click="submit"
      >
        {{ t(uncertain ? 'Cashier.retry' : 'MonthClosing.confirm.' + action) }}
      </j-permission-button>
    </div>
  </a-modal>
</template>
<style scoped>
.closing-confirm-content {
  display: grid;
  gap: 20px;
}
.closing-checks {
  margin-top: 20px;
}
.closing-blocker {
  color: var(--ant-color-warning-text, #874d00);
  margin: 8px 0 0;
}
.closing-footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
</style>
