<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DocumentType } from '../../../api/financeDocument'
import type { useDocumentWorkspace } from '../../../hooks/finance-document/useDocumentWorkspace'
const props = defineProps<{ state: ReturnType<typeof useDocumentWorkspace>; type: DocumentType }>()
const { t } = useI18n()
const {
  issuePending,
  reversePending,
  reopenPending,
  recoveryFailed,
  verification,
  permission,
  issueOpen,
  recoverReverse,
  recoverReopen
} = props.state
</script>
<template>
  <a-alert
    v-if="
      issuePending ||
      reversePending ||
      reopenPending ||
      recoveryFailed ||
      verification.pending.value ||
      verification.failed.value
    "
    type="warning"
    show-icon
    :message="t(recoveryFailed || verification.failed.value ? 'Document.recoveryUnavailable' : 'Document.pending')"
  >
    <template #action>
      <j-permission-button
        v-if="verification.pending.value"
        hasPermission="charging/FinanceReceipt:verify"
        @click="verification.recover"
      >
        {{ t('Verification.recover') }}
      </j-permission-button>
      <j-permission-button
        v-if="issuePending"
        :hasPermission="permission + ':create'"
        @click="issueOpen = true"
      >
        {{ t('Document.recoverIssue') }}
      </j-permission-button>
      <j-permission-button
        v-if="reopenPending"
        :hasPermission="permission + ':reopen'"
        @click="recoverReopen"
      >
        {{ t('Document.recoverReopen') }}
      </j-permission-button>
      <j-permission-button
        v-if="reversePending"
        :hasPermission="permission + (type === 'INVOICE' ? ':reverse' : ':void')"
        @click="recoverReverse"
      >
        {{ t('Document.recoverReverse') }}
      </j-permission-button>
    </template>
  </a-alert>
</template>
