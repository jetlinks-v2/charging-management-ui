<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { useI18n } from 'vue-i18n'
import type { ArrearsConfig, Category, DictionaryOption, Subject, SubjectInput } from '../../../api/financeSubject'
import { useSubjectForm } from '../../../hooks/finance-subject/useSubjectForm'
import { categoryTree, categoryPath } from '../../../hooks/finance-subject/categoryTree'
const props = defineProps<{
  open: boolean
  detail?: Subject
  selectedCategory: string
  categories: Category[]
  feeTypes: DictionaryOption[]
  arrearsOptions: ArrearsConfig[]
  state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
}>()
const emit = defineEmits<{ close: []; save: [SubjectInput] }>()
const { t } = useI18n()
const { model, form, save } = useSubjectForm(props, (input) => emit('save', input))
const required = [{ required: true, message: t('Subject.required') }]
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="640"
    icon="ProfileOutlined"
    :title="t('Finance.' + (state.readOnly ? 'detail' : detail ? 'edit' : 'create'))"
    :sub="detail?.name"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="state.loading"
      active
    />
    <a-empty
      v-else-if="state.failed"
      :description="false"
    />
    <a-descriptions
      v-else-if="state.readOnly && detail"
      :column="1"
      bordered
    >
      <a-descriptions-item :label="t('Subject.enabled')">
        <a-tag :color="detail.enabled ? 'success' : 'default'">
          {{ t(detail.enabled ? 'Subject.active' : 'Subject.inactive') }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item :label="t('Subject.code')">{{ detail.code }}</a-descriptions-item>
      <a-descriptions-item :label="t('Subject.name')">{{ detail.name }}</a-descriptions-item>
      <a-descriptions-item :label="t('Subject.category')">
        {{ categoryPath(categories, detail.categoryId) || '—' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('Subject.feeType')">
        {{ feeTypes.find((item) => item.value === detail?.feeType)?.text || detail.feeType }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('Subject.autoInvoice')">
        {{ t(detail.autoInvoice ? 'Subject.yes' : 'Subject.no') }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('Subject.arrearsConfig')">
        {{ arrearsOptions.find((item) => item.id === detail?.arrearsConfigId)?.name || '—' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('Subject.remark')">{{ detail.remark || '—' }}</a-descriptions-item>
      <a-descriptions-item :label="t('Finance.modified')">
        {{ detail.modifierName || '—' }} · {{ detail.modifyTime ? formatFinanceTime(detail.modifyTime) : '—' }}
      </a-descriptions-item>
    </a-descriptions>
    <a-form
      v-else
      ref="form"
      :model="model"
      layout="vertical"
      :disabled="state.saving"
    >
      <a-form-item
        v-if="detail"
        :label="t('Subject.code')"
      >
        <a-input
          :value="detail.code"
          disabled
        />
      </a-form-item>
      <a-form-item
        :label="t('Subject.category')"
        name="categoryId"
        :rules="required"
      >
        <a-tree-select
          v-model:value="model.categoryId"
          :tree-data="categoryTree(categories)"
          tree-default-expand-all
          :placeholder="t('Subject.chooseCategory')"
        />
      </a-form-item>
      <a-form-item
        :label="t('Subject.name')"
        name="name"
        :rules="[{ required: true, whitespace: true, message: t('Subject.required') }]"
      >
        <a-input
          v-model:value="model.name"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item
        :label="t('Subject.feeType')"
        name="feeType"
        :rules="required"
      >
        <a-select
          v-model:value="model.feeType"
          :options="feeTypes.map((item) => ({ value: item.value, label: item.text }))"
        />
      </a-form-item>
      <a-form-item
        :label="t('Subject.arrearsConfig')"
        name="arrearsConfigId"
        :rules="required"
      >
        <a-select
          v-model:value="model.arrearsConfigId"
          :options="arrearsOptions.map((item) => ({ value: item.id, label: item.name }))"
        />
        <div
          v-if="!arrearsOptions.length"
          class="finance-audit"
        >
          {{ t('Subject.configureArrears') }}
        </div>
      </a-form-item>
      <div class="finance-form-grid">
        <a-form-item :label="t('Subject.enabled')"><a-switch v-model:checked="model.enabled" /></a-form-item>
        <a-form-item :label="t('Subject.autoInvoice')"><a-switch v-model:checked="model.autoInvoice" /></a-form-item>
      </div>
      <a-form-item :label="t('Subject.remark')">
        <a-textarea
          v-model:value="model.remark"
          :maxlength="250"
          :rows="3"
          show-count
        />
      </a-form-item>
    </a-form>
    <template #foot>
      <a-button
        :disabled="state.saving"
        @click="emit('close')"
      >
        {{ t('Finance.close') }}
      </a-button>
      <a-button
        v-if="!state.readOnly"
        type="primary"
        :loading="state.saving"
        :disabled="state.loading || state.failed"
        @click="save"
      >
        {{ t('Finance.save') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
