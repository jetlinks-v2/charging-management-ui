<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Bank } from '../../../api/finance'
const props = defineProps<{ value: Bank[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:value': [Bank[]] }>()
const { t } = useI18n()
const change = (index: number, field: keyof Bank, value: string | boolean) =>
  emit(
    'update:value',
    props.value.map((row, i) => ({
      ...row,
      ...(i === index ? { [field]: value } : {}),
      ...(field === 'defaultBank' && value && i !== index ? { defaultBank: false } : {})
    }))
  )
const extraFields = ['financingInstitution', 'jointLineNumber', 'accountName', 'accountNumber'] as const
const add = () =>
  emit('update:value', [...props.value, { bankName: '', bankAccount: '', defaultBank: !props.value.length }])
</script>
<template>
  <section class="company-banks">
    <div class="finance-section-title">
      <h3>{{ t('Finance.banks') }}</h3>
      <a-button
        v-if="!disabled"
        type="link"
        @click="add"
      >
        <AIcon type="PlusOutlined" />
        {{ t('Finance.addBank') }}
      </a-button>
    </div>
    <CloudEmpty
      v-if="!value.length"
      :description="t('Finance.noBanks')"
    />
    <div
      v-for="(bank, index) in value"
      :key="bank.id || index"
      class="bank-row"
    >
      <div class="bank-row__top">
        <strong>{{ t('Finance.bankNumber', { number: index + 1 }) }}</strong>
        <a-tag
          v-if="disabled && bank.defaultBank"
          color="blue"
        >
          {{ t('Finance.default') }}
        </a-tag>
        <template v-if="!disabled">
          <a-radio
            :checked="bank.defaultBank"
            @change="change(index, 'defaultBank', true)"
          >
            {{ t('Finance.default') }}
          </a-radio>
          <a-button
            danger
            type="text"
            :aria-label="t('Finance.removeBank')"
            @click="
              emit(
                'update:value',
                value.filter((_, i) => i !== index)
              )
            "
          >
            <AIcon type="DeleteOutlined" />
          </a-button>
        </template>
      </div>
      <div class="finance-form-grid">
        <a-form-item
          :label="t('Finance.bankName')"
          :required="!disabled"
        >
          <a-input
            v-if="!disabled"
            :value="bank.bankName"
            :maxlength="100"
            @update:value="change(index, 'bankName', $event)"
          />
          <span v-else>{{ bank.bankName }}</span>
        </a-form-item>
        <a-form-item
          :label="t('Finance.bankAccount')"
          :required="!disabled"
        >
          <a-input
            v-if="!disabled"
            :value="bank.bankAccount"
            :maxlength="100"
            @update:value="change(index, 'bankAccount', $event)"
          />
          <span v-else>{{ bank.bankAccount }}</span>
        </a-form-item>
        <a-form-item
          v-for="field in extraFields"
          :key="field"
          :label="t('Finance.' + field)"
        >
          <a-input
            v-if="!disabled"
            :value="bank[field]"
            :maxlength="100"
            @update:value="change(index, field, $event)"
          />
          <span v-else>{{ bank[field] || '—' }}</span>
        </a-form-item>
      </div>
    </div>
  </section>
</template>
