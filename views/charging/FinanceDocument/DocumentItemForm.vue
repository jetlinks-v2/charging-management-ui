<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DocumentItem, DocumentCandidate, DocumentType } from '../../../api/financeDocument'
import { useDocumentItem } from '../../../hooks/finance-document/useDocumentItem'
import DocumentVoucherFields from './DocumentVoucherFields.vue'
const props = defineProps<{
  item: DocumentItem
  source: DocumentCandidate
  context: { type: DocumentType; disabled: boolean }
}>()
const { t } = useI18n()
useDocumentItem(props)
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="source.subjectName"
    :sub="source.fullName"
  >
    <div class="document-line-heading">
      <span>{{ source.startDate || '—' }} ～ {{ source.endDate || '—' }}</span>
      <span>
        {{ t('Document.available') }}
        <strong class="document-money">{{ source.availableAmount }}</strong>
      </span>
    </div>
    <div class="document-grid">
      <a-form-item
        :label="t('Document.issueAmount')"
        required
      >
        <a-input-number
          v-model:value="item.amount"
          :aria-label="t('Document.issueAmount')"
          string-mode
          :precision="2"
          :min="'0.01'"
          :max="source.availableAmount"
        />
      </a-form-item>
      <a-form-item
        v-if="context.type === 'INVOICE'"
        :label="t('Document.collectionMethod')"
      >
        <a-select
          v-model:value="item.collectionMethod"
          :options="['FULL', 'DIFFERENTIAL'].map((v) => ({ value: v, label: t('Document.method.' + v) }))"
        />
      </a-form-item>
      <a-form-item
        v-if="item.collectionMethod === 'DIFFERENTIAL'"
        :label="t('Document.differenceAmount')"
        required
      >
        <a-input-number
          v-model:value="item.differenceAmount"
          :aria-label="t('Document.differenceAmount')"
          string-mode
          :precision="2"
          :min="'0.01'"
        />
      </a-form-item>
    </div>
    <DocumentVoucherFields
      v-if="item.voucher && item.collectionMethod === 'DIFFERENTIAL'"
      :voucher="item.voucher"
      :disabled="context.disabled"
    />
  </SectionCard>
</template>
