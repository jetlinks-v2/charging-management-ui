<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HandoverRecord, HandoverActionInput } from '../../../api/financeHandover'
import { useHandoverAction } from '../../../hooks/finance-handover/useHandoverAction'
const props = defineProps<{ projectId: string; batch: HandoverRecord; action: HandoverActionInput['action'] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { reason, result, uncertain, failed, saving, locked, canClose, submit } = useHandoverAction(props, () =>
  emit('saved')
)
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Handover.action.' + action)"
    :width="560"
    :footer="null"
    :closable="canClose"
    :mask-closable="canClose"
    :keyboard="canClose"
    @cancel="close"
  >
    <a-result
      v-if="result"
      status="success"
      :title="t('Handover.actionDone')"
    />
    <div
      v-else
      class="handover-content"
    >
      <a-alert
        show-icon
        :type="uncertain || failed ? 'warning' : 'info'"
        :message="
          t(failed ? 'Document.recoveryUnavailable' : uncertain ? 'Handover.unknown' : 'Handover.actionHint.' + action)
        "
      />
      <a-descriptions
        :column="2"
        size="small"
      >
        <a-descriptions-item :label="t('Handover.date')">{{ batch.closingDate }}</a-descriptions-item>
        <a-descriptions-item :label="t('Handover.cash')">￥{{ batch.cashAmount }}</a-descriptions-item>
      </a-descriptions>
      <a-form layout="vertical">
        <a-form-item
          :label="t('Handover.reason')"
          required
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
    </div>
    <div class="handover-footer">
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        v-if="!result && !failed"
        type="primary"
        :hasPermission="'charging/FinanceHandoverRecord:' + action.toLowerCase()"
        :disabled="!reason.trim()"
        :loading="saving"
        @click="submit"
      >
        {{ t(uncertain ? 'Cashier.retry' : 'Handover.action.' + action) }}
      </j-permission-button>
    </div>
  </a-modal>
</template>
