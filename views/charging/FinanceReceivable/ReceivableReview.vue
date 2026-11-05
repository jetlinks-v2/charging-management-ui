<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Receivable, ReceivableReviewAction } from '../../../api/financeReceivable'
import { useReceivableReview } from '../../../hooks/finance-receivable/useReceivableReview'
import ReceivableReviewConfirm from './ReceivableReviewConfirm.vue'
const props = defineProps<{ projectId: string; selected: Receivable[] }>()
const emit = defineEmits<{ saved: []; lock: [value: boolean] }>()
const { t } = useI18n()
const { open, pending, recoveryFailed, targets, action, generation, blocked, start, recover, close } =
  useReceivableReview(props, () => emit('saved'))
const actions: ReceivableReviewAction[] = ['APPROVE', 'REJECT', 'UNAPPROVE']
watch(blocked, (value) => emit('lock', value), { immediate: true })
defineExpose({ start })
</script>
<template>
  <div
    v-if="pending || recoveryFailed"
    class="review-recovery"
  >
    <a-alert
      show-icon
      type="warning"
      :message="t(recoveryFailed ? 'Document.recoveryUnavailable' : 'ReceivableReview.pending')"
    />
    <a-button
      v-if="pending"
      @click="recover"
    >
      {{ t('ReceivableReview.recover') }}
    </a-button>
  </div>
  <a-space
    v-if="selected.length && !blocked"
    wrap
    class="review-batch"
  >
    <j-permission-button
      v-for="value in actions"
      :key="value"
      :hasPermission="'charging/FinanceReceivable:' + value.toLowerCase()"
      :disabled="selected.length > 100 || selected.some((row) => !row.allowedOperations.includes(value))"
      @click="start(selected, value)"
    >
      {{ t('ReceivableReview.action.' + value) }}
    </j-permission-button>
  </a-space>
  <ReceivableReviewConfirm
    v-if="open"
    :key="generation"
    :project-id="projectId"
    :rows="targets"
    :action="action"
    @close="close"
    @saved="emit('saved')"
  />
</template>
<style scoped>
.review-recovery {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.review-recovery :deep(.ant-alert) {
  flex: 1;
  min-width: 240px;
}
.review-batch {
  margin-bottom: 12px;
}
</style>
