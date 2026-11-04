<script setup lang="ts">
import type { DocumentType } from '../../../api/financeDocument'
import { useDocumentEditor } from '../../../hooks/finance-document/useDocumentEditor'
import { documentSourceKey } from '../../../utils/documentSelection'
import DocumentSources from './DocumentSources.vue'
import DocumentBuyerForm from './DocumentBuyerForm.vue'
import DocumentItemForm from './DocumentItemForm.vue'
import DocumentSnapshot from './DocumentSnapshot.vue'
const props = defineProps<{ projectId: string; type: DocumentType }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const state = useDocumentEditor(props, () => emit('saved'))
const {
  t,
  form,
  step,
  selected,
  items,
  buyer,
  preview,
  result,
  locked,
  busy,
  canClose,
  complete,
  calculate,
  submit,
  back,
  uncertain,
  failed
} = state
const close = () => {
  if (canClose.value) emit('close')
}
const permission = props.type === 'INVOICE' ? 'charging/FinanceInvoice:create' : 'charging/FinanceReceipt:create'
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    icon="FileAddOutlined"
    :title="t(type === 'INVOICE' ? 'Document.newInvoice' : 'Document.newReceipt')"
    @update:open="close"
  >
    <div class="document-editor">
      <a-steps
        v-if="!result"
        :current="step"
        size="small"
        :items="['sources', 'fill', 'review'].map((v) => ({ title: t('Document.step.' + v) }))"
      />
      <a-alert
        v-if="uncertain || failed"
        type="warning"
        show-icon
        :message="t(failed ? 'Document.recoveryUnavailable' : 'Document.unknown')"
      />
      <DocumentSnapshot
        v-if="result"
        :value="result"
      />
      <DocumentSnapshot
        v-else-if="step === 2 && preview"
        :value="preview"
      />
      <DocumentSources
        v-else-if="step === 0"
        :project-id="projectId"
        :type="type"
        :state="state"
      />
      <a-form
        v-else
        ref="form"
        layout="vertical"
        :model="{ buyer }"
        :disabled="locked || busy"
      >
        <DocumentBuyerForm
          :state="state"
          :type="type"
        />
        <DocumentItemForm
          v-for="(item, index) in items"
          :key="documentSourceKey(item)"
          :item="item"
          :source="selected[index]"
          :context="{ type, disabled: locked || busy }"
        />
        <small v-if="!complete">{{ t('Document.invalidAmount') }}</small>
      </a-form>
    </div>
    <template #foot>
      <a-button
        :disabled="!canClose"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="!result && !failed">
        <a-button
          v-if="step > 0 && !uncertain"
          :disabled="busy"
          @click="back"
        >
          {{ t('Document.back') }}
        </a-button>
        <a-button
          v-if="step === 0"
          type="primary"
          :disabled="!selected.length || busy"
          @click="step = 1"
        >
          {{ t('Document.next') }}
        </a-button>
        <j-permission-button
          v-else-if="step === 1"
          type="primary"
          :hasPermission="permission"
          :loading="busy"
          :disabled="!complete || !buyer.name.trim()"
          @click="calculate"
        >
          {{ t('Document.preview') }}
        </j-permission-button>
        <j-permission-button
          v-else
          type="primary"
          :hasPermission="permission"
          :loading="busy"
          @click="submit"
        >
          {{
            t(uncertain ? 'Cashier.retry' : type === 'INVOICE' ? 'Document.confirmInvoice' : 'Document.confirmReceipt')
          }}
        </j-permission-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
