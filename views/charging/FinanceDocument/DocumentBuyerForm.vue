<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useDocumentEditor } from '../../../hooks/finance-document/useDocumentEditor'
import type { DocumentType, DocumentBuyer } from '../../../api/financeDocument'
const props = defineProps<{ state: ReturnType<typeof useDocumentEditor>; type: DocumentType }>()
const { buyer, invoiceType, remark } = props.state
const { t } = useI18n()
const optionalFields: { key: keyof DocumentBuyer; max: number }[] = [
  { key: 'phone', max: 50 },
  { key: 'email', max: 255 },
  { key: 'address', max: 500 },
  { key: 'depositBank', max: 100 },
  { key: 'bankAccount', max: 100 },
  { key: 'extensionNumber', max: 32 }
]
const required = (key: string) => [
  { required: true, whitespace: true, message: t('Finance.required', { field: t(key) }) }
]
</script>
<template>
  <SectionCard
    icon="UserOutlined"
    :title="t('Document.buyerTitle')"
  >
    <div class="document-grid">
      <a-form-item
        :label="t('Document.buyer.name')"
        :name="['buyer', 'name']"
        :rules="required('Document.buyer.name')"
      >
        <a-input
          v-model:value="buyer.name"
          :maxlength="255"
        />
      </a-form-item>
      <a-form-item
        v-if="type === 'INVOICE'"
        :label="t('Document.invoiceType')"
      >
        <a-select
          v-model:value="invoiceType"
          :options="['1', '2'].map((v) => ({ value: v, label: t('Document.invoiceType' + v) }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Document.buyer.taxNum')"
        :name="['buyer', 'taxNum']"
        :rules="type === 'INVOICE' && invoiceType === '2' ? required('Document.buyer.taxNum') : []"
      >
        <a-input
          v-model:value="buyer.taxNum"
          :maxlength="50"
        />
      </a-form-item>
    </div>
  </SectionCard>
  <SectionCard
    icon="ContactsOutlined"
    :title="t('Document.buyerContact')"
  >
    <div class="document-grid">
      <a-form-item
        v-for="field in optionalFields"
        :key="field.key"
        :label="t('Document.buyer.' + field.key)"
        :name="['buyer', field.key]"
        :rules="field.key === 'email' ? [{ type: 'email', message: t('Document.emailInvalid') }] : []"
      >
        <a-input
          v-model:value="buyer[field.key]"
          :maxlength="field.max"
        />
      </a-form-item>
    </div>
    <a-form-item :label="t('Setting.remark')">
      <a-textarea
        v-model:value="remark"
        :maxlength="1000"
        :rows="2"
      />
    </a-form-item>
  </SectionCard>
</template>
