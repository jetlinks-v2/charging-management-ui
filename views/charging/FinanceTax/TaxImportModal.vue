<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useTaxCatalog } from '../../../hooks/finance-tax/useTaxCatalog'
const props = defineProps<{ state: ReturnType<typeof useTaxCatalog> }>()
const { t } = useI18n()
const {
  importOpen,
  importCompanyId,
  importFile,
  companyOptions,
  busy,
  closeImport,
  chooseFile,
  submitImport,
  template
} = props.state
</script>
<template>
  <a-modal
    :open="importOpen"
    :title="t('FinanceTax.import')"
    :width="620"
    :confirm-loading="busy"
    :ok-text="t('FinanceTax.confirmImport')"
    :cancel-text="t('Finance.cancel')"
    :mask-closable="!busy"
    :closable="!busy"
    :cancel-button-props="{ disabled: busy }"
    :ok-button-props="{ disabled: !importCompanyId || !importFile || busy }"
    @cancel="closeImport"
    @ok="submitImport"
  >
    <div class="tax-import-content">
      <p class="tax-import-hint">{{ t('FinanceTax.importHelp') }}</p>
      <a-form layout="vertical">
        <a-form-item
          :label="t('Finance.companyName')"
          required
        >
          <a-select
            v-model:value="importCompanyId"
            :options="companyOptions"
            :disabled="busy"
            show-search
            option-filter-prop="label"
            :placeholder="t('FinanceTax.chooseCompany')"
          />
        </a-form-item>
        <a-form-item
          :label="t('FinanceTax.importFile')"
          required
        >
          <a-upload-dragger
            accept=".xls,.xlsx"
            :multiple="false"
            :max-count="1"
            :disabled="busy"
            :before-upload="chooseFile"
            :file-list="importFile ? [{ uid: 'tax-import', name: importFile.name, status: 'done' }] : []"
            @remove="importFile = undefined"
          >
            <p class="ant-upload-drag-icon"><AIcon type="InboxOutlined" /></p>
            <p class="ant-upload-text">{{ t('FinanceTax.chooseFile') }}</p>
            <p class="ant-upload-hint">{{ t('FinanceTax.fileHelp') }}</p>
          </a-upload-dragger>
        </a-form-item>
      </a-form>
      <a-button
        type="link"
        :disabled="busy"
        @click="template"
      >
        <AIcon type="DownloadOutlined" />
        {{ t('FinanceTax.template') }}
      </a-button>
    </div>
  </a-modal>
</template>
<style scoped>
.tax-import-content {
  padding-top: 12px;
}
.tax-import-hint {
  margin-bottom: 20px;
  color: var(--ink-3, #595959);
  line-height: 1.7;
}
</style>
