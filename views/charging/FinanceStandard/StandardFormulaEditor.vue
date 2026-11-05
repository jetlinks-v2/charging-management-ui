<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormulaVariable } from '../../../api/financeStandard'
import { useStandardFormulaEditor } from '../../../hooks/finance-standard/useStandardFormulaEditor'
const props = defineProps<{
  projectId: string
  expression: string
  variables: FormulaVariable[]
  defaultExpression: string
}>()
const emit = defineEmits<{ confirm: [string] }>()
const { t } = useI18n()
const { open, draft, display, checking, begin, cancel, confirm } = useStandardFormulaEditor(props, (value) =>
  emit('confirm', value)
)
const input = ref<{ focus: () => void; resizableTextArea?: { textArea?: HTMLTextAreaElement } }>()
function insert(value: string) {
  const field = input.value?.resizableTextArea?.textArea
  const start = field?.selectionStart ?? draft.value.length
  const end = field?.selectionEnd ?? start
  draft.value = draft.value.slice(0, start) + value + draft.value.slice(end)
  input.value?.focus()
}
</script>
<template>
  <a-button @click="begin">
    <AIcon type="EditOutlined" />
    {{ t('Standard.setFormula') }}
  </a-button>
  <a-modal
    :open="open"
    :title="t('Standard.setFormula')"
    :width="720"
    :confirm-loading="checking"
    :ok-text="t('Standard.confirmFormula')"
    :ok-button-props="{ disabled: !draft.trim() }"
    @cancel="cancel"
    @ok="confirm"
  >
    <div class="formula-editor">
      <label class="formula-label">{{ t('Standard.variables') }}</label>
      <a-space
        wrap
        :size="[8, 8]"
      >
        <a-button
          v-for="item in variables.filter((row) => row.enabled)"
          :key="item.variableCode"
          size="small"
          :disabled="checking"
          @click="insert('${' + item.variableCode + '}')"
        >
          {{ item.variableName }}
        </a-button>
      </a-space>
      <div class="formula-operators">
        <a-button
          v-for="operator in ['+', '-', '*', '/', '(', ')']"
          :key="operator"
          :disabled="checking"
          @click="insert(operator)"
        >
          {{ operator }}
        </a-button>
        <a-button
          type="link"
          :disabled="checking"
          @click="draft = defaultExpression"
        >
          {{ t('Standard.resetFormula') }}
        </a-button>
      </div>
      <label
        for="standard-formula-expression"
        class="formula-label"
      >
        {{ t('Standard.formulaExpression') }}
      </label>
      <a-textarea
        id="standard-formula-expression"
        ref="input"
        v-model:value="draft"
        :disabled="checking"
        :rows="4"
        :maxlength="2000"
        :placeholder="t('Standard.formulaPlaceholder')"
      />
      <div class="formula-preview">
        <span>{{ t('Standard.formulaPreview') }}</span>
        <p>{{ display }}</p>
      </div>
      <div class="formula-hint">{{ t('Standard.formulaHint') }}</div>
    </div>
  </a-modal>
</template>
<style scoped>
.formula-editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  padding-top: 8px;
}
.formula-label {
  display: block;
  margin: 0;
  font-weight: 500;
}
.formula-operators {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.formula-preview {
  padding: 14px 16px;
  background: var(--bg-2, #fafafa);
  border: 1px solid var(--line, #f0f0f0);
  border-radius: 6px;
}
.formula-preview span,
.formula-hint {
  color: var(--ink-3, #737373);
  font-size: 12px;
}
.formula-preview p {
  margin: 8px 0 0;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
</style>
