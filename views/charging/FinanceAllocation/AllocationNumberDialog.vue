<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AllocationNumber } from '../../../api/financeAllocation'
defineProps<{ row: AllocationNumber; busy: boolean }>()
const emit = defineEmits<{ save: [reason: string]; cancel: [] }>()
const reason = ref('')
const { t } = useI18n()
</script>
<template>
  <a-modal
    open
    :title="t(row.enabled ? 'Allocation.discardNumber' : 'Allocation.enableNumber')"
    :footer="null"
    :closable="!busy"
    :mask-closable="false"
    :width="480"
    @cancel="emit('cancel')"
  >
    <a-form
      layout="vertical"
      :model="{ reason }"
      :disabled="busy"
      @finish="emit('save', reason)"
    >
      <a-form-item :label="t('Allocation.number')">
        <a-input
          :value="row.number"
          readonly
        />
      </a-form-item>
      <a-form-item
        :label="t('Allocation.reason')"
        name="reason"
        :rules="[{ required: true, whitespace: true, message: t('Allocation.reasonRequired') }]"
      >
        <a-textarea
          v-model:value="reason"
          :rows="3"
          :maxlength="500"
        />
      </a-form-item>
      <div class="allocation-footer">
        <a-button
          :disabled="busy"
          @click="emit('cancel')"
        >
          {{ t('Finance.cancel') }}
        </a-button>
        <j-permission-button
          type="primary"
          html-type="submit"
          hasPermission="charging/FinanceReceipt:allocation-pool"
          :loading="busy"
        >
          {{ t('Finance.save') }}
        </j-permission-button>
      </div>
    </a-form>
  </a-modal>
</template>
