<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentType } from '../../../api/financeDocument'
import DocumentRule from '../FinanceDocumentRule/index.vue'
import Allocation from '../FinanceAllocation/index.vue'
defineProps<{ type: DocumentType; disabled: boolean }>()
const { t } = useI18n()
const open = ref(false)
</script>
<template>
  <j-permission-button
    :hasPermission="type === 'INVOICE' ? 'charging/FinanceInvoice:rule' : 'charging/FinanceReceipt:allocation'"
    :disabled="disabled"
    @click="open = true"
  >
    {{ t(type === 'INVOICE' ? 'Document.ruleTitle' : 'Document.allocation') }}
  </j-permission-button>
  <JlDrawerShell
    :open="open"
    :width="1180"
    icon="SettingOutlined"
    :title="t(type === 'INVOICE' ? 'Document.ruleTitle' : 'Document.allocation')"
    @update:open="open = false"
  >
    <DocumentRule
      v-if="open && type === 'INVOICE'"
      embedded
    />
    <Allocation
      v-else-if="open"
      embedded
    />
  </JlDrawerShell>
</template>
