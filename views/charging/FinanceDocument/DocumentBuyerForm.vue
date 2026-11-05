<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { watch, type Ref } from 'vue'
import type { DocumentType, DocumentBuyer } from '../../../api/financeDocument'
const props = defineProps<{
  state: { buyer: DocumentBuyer; invoiceType: Ref<'1' | '2'>; remark: Ref<string> }
  type: DocumentType
}>()
const { buyer, invoiceType, remark } = props.state
const { t } = useI18n()
watch(
  () => buyer.titleType,
  (value) => {
    if (value === 'PERSONAL') invoiceType.value = '1'
  }
)
const optionalFields: { key: Exclude<keyof DocumentBuyer, 'titleType'>; max: number }[] = [
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
        v-if="type === 'INVOICE'"
        :label="t('Document.buyer.titleType')"
        :name="['buyer', 'titleType']"
        :rules="required('Document.buyer.titleType')"
      >
        <a-radio-group
          v-model:value="buyer.titleType"
          :options="['ENTERPRISE', 'PERSONAL'].map((value) => ({ value, label: t('Document.titleType.' + value) }))"
        />
      </a-form-item>
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
          :options="
            ['1', '2'].map((v) => ({
              value: v,
              label: t('Document.invoiceType' + v),
              disabled: v === '2' && buyer.titleType === 'PERSONAL'
            }))
          "
        />
      </a-form-item>
      <a-form-item
        :label="t('Document.buyer.taxNum')"
        :name="['buyer', 'taxNum']"
        :rules="type === 'INVOICE' && buyer.titleType === 'ENTERPRISE' ? required('Document.buyer.taxNum') : []"
      >
        <a-input
          v-model:value="buyer.taxNum"
          :maxlength="50"
        />
      </a-form-item>
    </div>
  </SectionCard>
  <a-collapse :bordered="false">
    <a-collapse-panel
      key="contacts"
      :header="t('Document.buyerContact')"
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
    </a-collapse-panel>
  </a-collapse>
  <a-form-item :label="t('Setting.remark')">
    <a-textarea
      v-model:value="remark"
      :maxlength="1000"
      :rows="2"
    />
  </a-form-item>
</template>
