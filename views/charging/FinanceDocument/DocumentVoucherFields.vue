<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import type { DifferenceVoucher } from '../../../api/financeDocument'
import { useDocumentVoucher } from '../../../hooks/finance-document/useDocumentItem'
const props = defineProps<{ voucher: DifferenceVoucher; disabled: boolean }>()
const { t } = useI18n()
const { files, invoiceVoucher, change } = useDocumentVoucher(props)
</script>
<template>
  <div class="document-grid">
    <a-form-item
      :label="t('Document.voucher.type')"
      required
    >
      <a-select
        v-model:value="voucher.type"
        :aria-label="t('Document.voucher.type')"
        :options="['10', '11'].map((v) => ({ value: v, label: t('Document.voucherTypes.' + v) }))"
      />
    </a-form-item>
    <a-form-item
      :label="t('Document.voucher.date')"
      required
    >
      <a-date-picker
        v-model:value="voucher.date"
        :aria-label="t('Document.voucher.date')"
        :placeholder="t('Document.voucher.date')"
        value-format="YYYY-MM-DD"
      />
    </a-form-item>
    <template v-if="invoiceVoucher">
      <a-form-item :label="t('Document.voucher.electronicInvoiceNumber')">
        <a-input
          v-model:value="voucher.electronicInvoiceNumber"
          :aria-label="t('Document.voucher.electronicInvoiceNumber')"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item :label="t('Document.voucher.invoiceCode')">
        <a-input
          v-model:value="voucher.invoiceCode"
          :aria-label="t('Document.voucher.invoiceCode')"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item :label="t('Document.voucher.invoiceNumber')">
        <a-input
          v-model:value="voucher.invoiceNumber"
          :aria-label="t('Document.voucher.invoiceNumber')"
          :maxlength="100"
        />
      </a-form-item>
    </template>
    <a-form-item
      v-else
      :label="t('Document.voucher.number')"
      required
    >
      <a-input
        v-model:value="voucher.number"
        :aria-label="t('Document.voucher.number')"
        :maxlength="100"
      />
    </a-form-item>
    <a-form-item
      :label="t('Document.voucher.amount')"
      required
    >
      <a-input-number
        v-model:value="voucher.amount"
        :aria-label="t('Document.voucher.amount')"
        string-mode
        :precision="2"
        :min="'0.01'"
      />
    </a-form-item>
  </div>
  <small>{{ t('Document.voucher.numberHint') }}</small>
  <a-form-item
    :label="t('Document.voucher.attachment')"
    required
  >
    <FileUpload
      v-model:file-list="files"
      :max-count="1"
      :disabled="disabled"
      :btn-text="t('Document.voucher.upload')"
      @change="change"
    />
  </a-form-item>
</template>
