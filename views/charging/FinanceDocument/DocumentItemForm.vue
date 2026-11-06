<script setup lang="ts">
import type { DocumentItem, DocumentCandidate } from '../../../api/financeDocument'
import { documentSourceKey } from '../../../utils/documentSelection'
import { useDocumentInvoiceLines } from '../../../hooks/finance-document/useDocumentInvoiceLines'
import DocumentVoucherFields from './DocumentVoucherFields.vue'
const props = defineProps<{ items: DocumentItem[]; sources: DocumentCandidate[]; disabled: boolean }>()
const { t, activeItem, rows, columns, estimateDocumentTax, formatDocumentRate, validDocumentDeduction } =
  useDocumentInvoiceLines(props)
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Document.lines')"
  >
    <a-table
      :columns="columns"
      :data-source="rows"
      :row-key="(row) => documentSourceKey(row.item)"
      :pagination="false"
      :scroll="{ x: 1590 }"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'house'">{{ record.source.fullName }}</template>
        <template v-else-if="column.key === 'customer'">{{ record.source.customerName }}</template>
        <template v-else-if="column.key === 'subject'">{{ record.source.subjectName }}</template>
        <template v-else-if="column.key === 'standard'">{{ record.source.standardName || '—' }}</template>
        <a-select
          v-else-if="column.key === 'method'"
          v-model:value="record.item.collectionMethod"
          :aria-label="t('Document.collectionMethod')"
          :disabled="disabled"
          :options="['FULL', 'DIFFERENTIAL'].map((value) => ({ value, label: t('Document.method.' + value) }))"
          style="width: 112px"
        />
        <template v-else-if="column.key === 'sourceAmount'">{{ record.source.allowedAmount }}</template>
        <template v-else-if="column.key === 'difference'">
          <a-input-number
            v-if="record.item.collectionMethod === 'DIFFERENTIAL'"
            v-model:value="record.item.differenceAmount"
            :aria-label="t('Document.differenceAmount')"
            string-mode
            :precision="2"
            :min="'0.01'"
            :disabled="disabled"
            style="width: 125px"
          />
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'voucher'">
          <a-button
            v-if="record.item.collectionMethod === 'DIFFERENTIAL'"
            type="link"
            :disabled="disabled"
            @click="activeItem = record.item"
          >
            {{ t(validDocumentDeduction(record.item) ? 'Document.editVoucher' : 'Document.fillVoucher') }}
          </a-button>
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'rate'">{{ formatDocumentRate(record.source.taxRate) }}</template>
        <strong
          v-else-if="column.key === 'amount'"
          class="document-money"
        >
          {{ record.source.availableAmount }}
        </strong>
        <template v-else-if="column.key === 'tax'">{{ estimateDocumentTax(record.item, record.source) }}</template>
      </template>
    </a-table>
  </SectionCard>
  <a-modal
    :open="!!activeItem"
    :title="t('Document.voucherTitle')"
    :width="720"
    :mask-closable="false"
    :body-style="{ maxHeight: '65vh', overflow: 'auto' }"
    @cancel="activeItem = undefined"
  >
    <a-form
      v-if="activeItem?.voucher"
      layout="vertical"
      :disabled="disabled"
    >
      <DocumentVoucherFields
        :key="documentSourceKey(activeItem)"
        :voucher="activeItem.voucher"
        :disabled="disabled"
      />
    </a-form>
    <template #footer>
      <a-button
        type="primary"
        :disabled="disabled || !activeItem || !validDocumentDeduction(activeItem)"
        @click="activeItem = undefined"
      >
        {{ t('Finance.save') }}
      </a-button>
    </template>
  </a-modal>
</template>
