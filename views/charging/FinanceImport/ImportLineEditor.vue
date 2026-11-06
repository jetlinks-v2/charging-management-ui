<script setup lang="ts">
import type { HistoricalImportRecord, HistoricalImportLine } from '../../../api/financeReceivable'
import type { CollectionImportKind } from '../../../api/financeCollectionImport'
import { useImportLineEditor } from '../../../hooks/finance-import/useImportLineEditor'
const props = defineProps<{
  projectId: string
  record: HistoricalImportRecord
  line: HistoricalImportLine
  kind?: CollectionImportKind
}>()
const emit = defineEmits<{ close: []; saved: [{ record: HistoricalImportRecord; line: HistoricalImportLine }] }>()
const { t, form, model, fields, busy, rules, submit } = useImportLineEditor(props, (value) => emit('saved', value))
</script>
<template>
  <a-modal
    open
    :title="t('CollectionImport.editLine', { row: line.lineNumber })"
    :width="900"
    :confirm-loading="busy"
    :closable="!busy"
    :keyboard="!busy"
    :mask-closable="false"
    :cancel-button-props="{ disabled: busy }"
    :ok-text="t('CollectionImport.saveValidate')"
    @cancel="emit('close')"
    @ok="submit"
  >
    <a-form
      ref="form"
      :model="model"
      layout="vertical"
    >
      <a-row :gutter="20">
        <a-col
          v-for="field in fields"
          :key="field.key"
          :span="12"
        >
          <a-form-item
            :label="t(field.label)"
            :name="field.key"
            :rules="rules(field)"
          >
            <a-date-picker
              v-if="['date', 'datetime', 'month'].includes(field.type || '')"
              v-model:value="model[field.key]"
              :picker="field.type === 'month' ? 'month' : 'date'"
              :show-time="field.type === 'datetime' ? { format: 'HH:mm' } : false"
              :format="field.type === 'datetime' ? 'YYYY-MM-DD HH:mm' : field.type === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'"
              :value-format="
                field.type === 'datetime' ? 'YYYY-MM-DD HH:mm' : field.type === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'
              "
              :disabled="busy || field.readonly"
              style="width: 100%"
            />
            <a-input-number
              v-else-if="field.type === 'money' || field.type === 'number'"
              v-model:value="model[field.key]"
              string-mode
              :precision="field.type === 'money' ? 2 : 4"
              :min="'0'"
              :disabled="busy || field.readonly"
              style="width: 100%"
            />
            <a-input
              v-else
              v-model:value="model[field.key]"
              :disabled="busy || field.readonly"
              :maxlength="
                field.key === 'fullName' ? 2000 : ['remark', 'reductionReason'].includes(field.key) ? 1000 : 255
              "
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>
