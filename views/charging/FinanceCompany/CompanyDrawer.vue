<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CompanyDetail, CompanyInput } from '../../../api/finance'
import { useCompanyForm } from '../../../hooks/finance/useCompanyForm'
import CompanyBanks from './CompanyBanks.vue'
const props = defineProps<{
  open: boolean
  detail?: CompanyDetail
  state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
}>()
const emit = defineEmits<{ close: []; retry: []; save: [CompanyInput] }>()
const { t } = useI18n()
const { form, model, sections, submit } = useCompanyForm(props, (input) => emit('save', input))
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="800"
    icon="BankOutlined"
    :title="t('Finance.' + (state.readOnly ? 'detail' : detail ? 'edit' : 'create'))"
    :sub="detail?.company.companyName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="state.loading"
      active
      :paragraph="{ rows: 10 }"
    />
    <CloudEmpty
      v-else-if="state.failed"
      :description="t('Finance.detailFailed')"
    >
      <a-button @click="emit('retry')">{{ t('Finance.retry') }}</a-button>
    </CloudEmpty>
    <a-form
      v-else
      ref="form"
      :model="model"
      layout="vertical"
      class="finance-company-form"
    >
      <section
        v-for="section in sections"
        :key="section.title"
      >
        <h3 class="finance-section-title">{{ section.title }}</h3>
        <div class="finance-form-grid">
          <a-form-item
            v-for="field in section.fields"
            :key="field.key"
            :name="field.key"
            :label="t('Finance.' + field.key)"
            :rules="
              state.readOnly
                ? []
                : [
                    {
                      required: field.required,
                      whitespace: true,
                      message: t('Finance.required', { field: t('Finance.' + field.key) })
                    },
                    ...(['bankAccount', 'invoiceExtensionNumber'].includes(field.key)
                      ? [{ pattern: /^\d*$/, message: t('Finance.digits') }]
                      : [])
                  ]
            "
          >
            <span
              v-if="state.readOnly"
              class="finance-field-value"
            >
              {{ model[field.key] || '—' }}
            </span>
            <a-input
              v-else
              v-model:value="model[field.key]"
              :maxlength="field.max"
              :disabled="state.saving"
            />
          </a-form-item>
        </div>
      </section>
      <CompanyBanks
        v-model:value="model.banks"
        :disabled="state.readOnly || state.saving"
      />
      <div
        v-if="detail && state.readOnly"
        class="finance-audit"
      >
        {{ t('Finance.modified') }}：{{ detail.company.modifierName || '—' }} ·
        {{ detail.company.modifyTime ? new Date(detail.company.modifyTime).toLocaleString() : '—' }}
      </div>
    </a-form>
    <template #foot>
      <a-button
        :disabled="state.saving"
        @click="emit('close')"
      >
        {{ t('Finance.' + (state.readOnly ? 'close' : 'cancel')) }}
      </a-button>
      <a-button
        v-if="!state.readOnly"
        type="primary"
        :loading="state.saving"
        :disabled="state.loading || state.failed"
        @click="submit"
      >
        {{ t('Finance.save') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
