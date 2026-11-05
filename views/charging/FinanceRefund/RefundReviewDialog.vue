<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useRefundReview } from '../../../hooks/finance-cashier/useRefundReview'
const props = defineProps<{ state: ReturnType<typeof useRefundReview> }>()
const { t } = useI18n()
const { target, targets, action, reason, saving, uncertain, results, submit, cancel } = props.state
</script>
<template>
  <a-modal
    :open="!!target"
    :title="t('Refund.' + action)"
    :confirm-loading="saving"
    :closable="!saving && !uncertain"
    :mask-closable="false"
    :keyboard="!saving && !uncertain"
    @ok="submit"
    @cancel="cancel"
  >
    <a-descriptions
      v-if="target"
      :column="1"
      size="small"
    >
      <a-descriptions-item :label="t('Refund.applicationNumber')">{{ target.number }}</a-descriptions-item>
      <a-descriptions-item
        v-if="targets.length === 1"
        :label="t('Refund.receiver')"
      >
        {{ target.receiverName }}
      </a-descriptions-item>
      <a-descriptions-item
        v-else
        :label="t('Refund.applicationCount')"
      >
        {{ targets.length }}
      </a-descriptions-item>
    </a-descriptions>
    <a-alert
      v-if="uncertain"
      type="warning"
      show-icon
      :message="t('Refund.unknownResult')"
    />
    <a-form layout="vertical">
      <a-form-item
        :label="t('Refund.reviewReason')"
        required
      >
        <a-textarea
          v-model:value="reason"
          :disabled="saving || uncertain"
          :rows="3"
          :maxlength="1000"
          show-count
        />
      </a-form-item>
    </a-form>
    <div
      v-for="row in results"
      :key="row.id"
      class="refund-review-result"
    >
      <a-tag :color="row.success ? 'green' : 'red'">
        {{ t(row.success ? 'Refund.reviewSucceeded' : 'Refund.reviewFailed') }}
      </a-tag>
      <span>{{ targets.find((r) => r.line.applicationId === row.id)?.number || row.id }}</span>
      <div v-if="!row.success">{{ t('Refund.reviewRetryHint') }}</div>
    </div>
  </a-modal>
</template>
<style scoped>
.ant-form {
  margin-top: 20px;
}
.refund-review-result {
  margin-top: 10px;
  overflow-wrap: anywhere;
}
</style>
