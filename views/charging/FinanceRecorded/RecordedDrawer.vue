<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useRecorded } from '../../../hooks/finance-recorded/useRecorded'
import { useRecordedForm } from '../../../hooks/finance-recorded/useRecordedForm'
import RecordedFee from './RecordedFee.vue'
const props = defineProps<{ state: ReturnType<typeof useRecorded> }>()
const { t } = useI18n()
const formProps = {
  get open() {
    return props.state.open.value
  },
  get detail() {
    return props.state.detail.value
  },
  get readOnly() {
    return props.state.readOnly.value
  }
}
const { form, model, companyChanged, selection, changeFeeType, addTier, removeTier, submit } = useRecordedForm(
  formProps,
  props.state.loadBanks,
  props.state.save
)
const disabled = computed(() => props.state.saving.value || props.state.optionLoading.value)
const dictionaryOptions = (kind: 'sources' | 'payments') =>
  props.state[kind].value.map((row) => ({ value: row.value, label: row.text }))
const required = (field: string) => [{ required: true, message: t('Finance.required', { field: t(field) }) }]
</script>
<template>
  <JlDrawerShell
    :open="state.open.value"
    :width="820"
    icon="AccountBookOutlined"
    :title="t(state.readOnly.value ? 'Recorded.detail' : state.detail.value ? 'Recorded.edit' : 'Recorded.create')"
    :sub="state.detail.value?.record.companyName"
    @update:open="state.close"
  >
    <a-skeleton
      v-if="state.loading.value"
      active
      :paragraph="{ rows: 10 }"
    />
    <template v-else-if="state.readOnly.value && state.detail.value">
      <a-descriptions
        :column="2"
        bordered
        size="small"
      >
        <a-descriptions-item :label="t('Finance.companyName')">
          {{ state.detail.value.record.companyName }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('Recorded.bank')">{{ state.detail.value.record.bankName }}</a-descriptions-item>
        <a-descriptions-item :label="t('Recorded.sourceCharge')">
          {{ state.detail.value.record.sourceChargeText }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('Recorded.patternPayment')">
          {{ state.detail.value.record.patternPaymentText }}
        </a-descriptions-item>
        <a-descriptions-item
          v-if="model.facilitatorId"
          :label="t('Recorded.facilitator')"
          :span="2"
        >
          {{ model.facilitatorId }}
        </a-descriptions-item>
      </a-descriptions>
      <RecordedFee
        :model="model"
        :read-only="true"
        :disabled="true"
      />
      <p class="finance-audit">
        {{ t('Finance.modified') }}：{{ state.detail.value.record.modifierName || '—' }} ·
        {{
          state.detail.value.record.modifyTime ? new Date(state.detail.value.record.modifyTime).toLocaleString() : '—'
        }}
      </p>
    </template>
    <a-spin
      v-else
      :spinning="state.optionLoading.value"
    >
      <a-form
        ref="form"
        :model="model"
        layout="vertical"
        class="finance-company-form"
      >
        <div class="finance-form-grid">
          <a-form-item
            :label="t('Recorded.sourceCharge')"
            name="sourceCharges"
            :rules="required('Recorded.sourceCharge')"
          >
            <a-select
              :value="state.detail.value ? model.sourceCharges[0] : model.sourceCharges"
              :mode="state.detail.value ? undefined : 'multiple'"
              :options="dictionaryOptions('sources')"
              :disabled="disabled"
              @update:value="selection('sourceCharges', $event)"
            />
          </a-form-item>
          <a-form-item
            :label="t('Recorded.patternPayment')"
            name="patternPayments"
            :rules="required('Recorded.patternPayment')"
          >
            <a-select
              :value="state.detail.value ? model.patternPayments[0] : model.patternPayments"
              :mode="state.detail.value ? undefined : 'multiple'"
              :options="dictionaryOptions('payments')"
              :disabled="disabled"
              @update:value="selection('patternPayments', $event)"
            />
          </a-form-item>
          <a-form-item
            :label="t('Finance.companyName')"
            name="companyId"
            :rules="required('Finance.companyName')"
          >
            <a-select
              :value="model.companyId || undefined"
              :options="state.companies.value.map((row) => ({ value: row.id, label: row.companyName }))"
              :disabled="disabled"
              @change="companyChanged"
            />
          </a-form-item>
          <a-form-item
            :label="t('Recorded.bank')"
            name="bankId"
            :rules="required('Recorded.bank')"
          >
            <a-select
              v-model:value="model.bankId"
              :options="
                state.banks.value.map((bank) => ({ value: bank.id, label: bank.bankName + ' · ' + bank.bankAccount }))
              "
              :disabled="disabled || !model.companyId"
            />
          </a-form-item>
        </div>
        <RecordedFee
          :model="model"
          :read-only="false"
          :disabled="disabled"
          @change-type="changeFeeType"
          @add="addTier"
          @remove="removeTier"
        />
        <p v-if="!state.optionsReady.value && !state.optionLoading.value">
          <a-button @click="state.loadOptions">{{ t('Recorded.reloadOptions') }}</a-button>
        </p>
      </a-form>
    </a-spin>
    <template #foot>
      <a-button
        :disabled="state.saving.value"
        @click="state.close"
      >
        {{ t('Finance.' + (state.readOnly.value ? 'close' : 'cancel')) }}
      </a-button>
      <a-button
        v-if="!state.readOnly.value"
        type="primary"
        :loading="state.saving.value"
        :disabled="state.loading.value || state.failed.value || !state.optionsReady.value"
        @click="submit"
      >
        {{ t('Finance.save') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
