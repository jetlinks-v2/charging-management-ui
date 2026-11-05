<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentRecord, DocumentType } from '../../../api/financeDocument'
const props = defineProps<{ row: DocumentRecord; type: DocumentType; blocked: boolean }>()
const emit = defineEmits<{ detail: []; reverse: []; reopen: []; verify: [] }>()
const { t } = useI18n()
const permission = computed(() => (props.type === 'INVOICE' ? 'charging/FinanceInvoice' : 'charging/FinanceReceipt'))
</script>
<template>
  <a-button
    type="link"
    @click="emit('detail')"
  >
    {{ t('Finance.detail') }}
  </a-button>
  <j-permission-button
    v-if="type === 'RECEIPT' && row.status === 'ISSUED' && !row.verified"
    type="link"
    :hasPermission="permission + ':verify'"
    :disabled="blocked"
    @click="emit('verify')"
  >
    {{ t('Verification.verify') }}
  </j-permission-button>
  <j-permission-button
    v-if="['SIMULATED_ISSUED', 'ISSUED'].includes(row.status) && !(type === 'RECEIPT' && row.verified)"
    type="link"
    danger
    :hasPermission="permission + (type === 'INVOICE' ? ':reverse' : ':void')"
    :disabled="blocked"
    @click="emit('reverse')"
  >
    {{ t(type === 'INVOICE' ? 'Document.reverse' : 'Document.void') }}
  </j-permission-button>
  <j-permission-button
    v-if="
      type === 'INVOICE' && ['SIMULATED_ISSUED', 'SIMULATED_REVERSED'].includes(row.status) && !row.reopenDocumentId
    "
    type="link"
    :hasPermission="permission + ':reopen'"
    :disabled="blocked"
    @click="emit('reopen')"
  >
    {{ t('Document.reopen') }}
  </j-permission-button>
</template>
