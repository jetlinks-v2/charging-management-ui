<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentRecord } from '../../../api/financeDocument'
import { useReceiptVerification } from '../../../hooks/finance-document/useReceiptVerification'
const props = defineProps<{ projectId: string; documents: DocumentRecord[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { remark, documents, locked, canClose, submit, saving, uncertain, result, failed } = useReceiptVerification(
  props,
  () => emit('saved')
)
const columns = computed(() => [
  { title: t('Document.number'), dataIndex: 'documentNumber', width: 260 },
  { title: t('Document.buyer.name'), dataIndex: 'buyerName', width: 170 },
  { title: t('Document.total'), dataIndex: 'amount', align: 'right' as const, width: 130 }
])
const close = () => {
  if (canClose.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :width="720"
    :title="t('Verification.verify')"
    :footer="null"
    :mask-closable="canClose"
    :closable="canClose"
    :keyboard="canClose"
    @cancel="close"
  >
    <a-result
      v-if="result"
      status="success"
      :title="t('Verification.success')"
      :sub-title="t('Verification.completed', { count: result.length })"
    />
    <div
      v-else
      class="verification-content"
    >
      <a-alert
        show-icon
        :type="uncertain || failed ? 'warning' : 'info'"
        :message="t(failed ? 'Document.recoveryUnavailable' : uncertain ? 'Document.unknown' : 'Verification.hint')"
      />
      <a-table
        row-key="id"
        size="small"
        :columns="columns"
        :data-source="documents"
        :pagination="documents.length > 10 ? { pageSize: 10 } : false"
        :scroll="{ x: 560 }"
      />
      <a-form layout="vertical">
        <a-form-item :label="t('Verification.remark')">
          <a-textarea
            v-model:value="remark"
            :rows="3"
            :maxlength="200"
            show-count
            :disabled="locked"
            :placeholder="t('Verification.remarkHint')"
          />
        </a-form-item>
      </a-form>
    </div>
    <div class="verification-footer">
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        v-if="!result && !failed"
        type="primary"
        hasPermission="charging/FinanceReceipt:verify"
        :loading="saving"
        @click="submit"
      >
        {{ t(uncertain ? 'Cashier.retry' : 'Verification.confirm') }}
      </j-permission-button>
    </div>
  </a-modal>
</template>
<style scoped>
.verification-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 65vh;
  overflow: auto;
}
.verification-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
