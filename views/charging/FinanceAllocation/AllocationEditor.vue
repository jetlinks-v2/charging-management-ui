<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AllocationBook, AllocationInput, AllocationOptions } from '../../../api/financeAllocation'
import { useAllocationEditor } from '../../../hooks/finance-allocation/useAllocationEditor'
const props = defineProps<{ project: string; detail?: AllocationBook; options: AllocationOptions; busy: boolean }>()
const emit = defineEmits<{ save: [input: AllocationInput]; cancel: []; error: [e: unknown] }>()
const { t } = useI18n()
const { model, recipients, loading, more, endNumber, search, loadMore } = useAllocationEditor(
  props.project,
  props.detail,
  (e) => emit('error', e)
)
const choice = (values: Record<string, string>, value?: string, label?: string) =>
  Object.entries({ ...values, ...(value && label ? { [value]: label } : {}) }).map(([value, label]) => ({
    value,
    label
  }))
const types = computed(() => choice(props.options.types, props.detail?.billType, props.detail?.billTypeName)),
  sources = computed(() => choice(props.options.sources, props.detail?.billSource, props.detail?.billSourceName))
const required = { required: true, message: t('Allocation.required') }
function submit() {
  if (endNumber.value === undefined || endNumber.value > 999999999999) return
  emit('save', { ...model, billSource: model.billSource || undefined, quota: model.quota || undefined })
}
</script>
<template>
  <a-form
    layout="vertical"
    :model="model"
    :disabled="busy"
    @finish="submit"
    class="allocation-form"
  >
    <SectionCard
      icon="UserOutlined"
      :title="t('Allocation.recipientSection')"
    >
      <div class="allocation-grid">
        <a-form-item
          :label="t('Allocation.recipient')"
          name="recipientId"
          :rules="[required]"
        >
          <a-select
            v-model:value="model.recipientId"
            show-search
            :filter-option="false"
            :loading="loading"
            :options="recipients.map((u) => ({ value: u.id, label: u.name + '（' + u.username + '）' }))"
            @search="(v) => search(v)"
            @dropdown-visible-change="(v) => v && search()"
          >
            <template #dropdownRender="{ menuNode }">
              <component :is="menuNode" />
              <a-button
                v-if="more"
                type="link"
                block
                :loading="loading"
                @mousedown.prevent
                @click="loadMore"
              >
                {{ t('Allocation.loadMore') }}
              </a-button>
            </template>
          </a-select>
        </a-form-item>
        <a-form-item
          :label="t('Allocation.buyDate')"
          name="buyDate"
          :rules="[required]"
        >
          <a-date-picker
            v-model:value="model.buyDate"
            value-format="YYYY-MM-DD"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.billType')"
          name="billType"
          :rules="[required]"
        >
          <a-select
            v-model:value="model.billType"
            :options="types"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.billCode')"
          name="billCode"
          :rules="[required, { pattern: /^[A-Za-z0-9_~!@#$%^&*\-]{1,255}$/, message: t('Allocation.codeInvalid') }]"
        >
          <a-input
            v-model:value="model.billCode"
            :maxlength="255"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.billSource')"
          name="billSource"
        >
          <a-select
            v-model:value="model.billSource"
            allow-clear
            :options="sources"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.quota')"
          name="quota"
          :rules="[{ pattern: /^\d{1,16}(\.\d{1,2})?$/, message: t('Allocation.moneyInvalid') }]"
        >
          <a-input
            v-model:value="model.quota"
            inputmode="decimal"
            :suffix="t('Allocation.yuan')"
          />
        </a-form-item>
      </div>
    </SectionCard>
    <SectionCard
      icon="NumberOutlined"
      :title="t('Allocation.rangeSection')"
    >
      <div class="allocation-grid">
        <a-form-item
          :label="t('Allocation.bookCount')"
          name="bookCount"
          :rules="[required]"
        >
          <a-input-number
            v-model:value="model.bookCount"
            :disabled="!!detail"
            :min="1"
            :max="99"
            :precision="0"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.numberCount')"
          name="numberCount"
          :rules="[required]"
        >
          <a-input-number
            v-model:value="model.numberCount"
            :min="1"
            :max="9999"
            :precision="0"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.startNumber')"
          name="startNumber"
          :rules="[required]"
        >
          <a-input-number
            v-model:value="model.startNumber"
            :min="1"
            :max="999999999999"
            :precision="0"
          />
        </a-form-item>
        <a-form-item
          :label="t('Allocation.endNumber')"
          :validate-status="(endNumber || 0) > 999999999999 ? 'error' : undefined"
          :help="(endNumber || 0) > 999999999999 ? t('Allocation.rangeInvalid') : undefined"
        >
          <a-input
            :value="endNumber"
            readonly
          />
        </a-form-item>
        <a-form-item :label="t('Allocation.enabled')"><a-switch v-model:checked="model.enabled" /></a-form-item>
        <a-form-item :label="t('Allocation.recovered')"><a-switch v-model:checked="model.recovered" /></a-form-item>
      </div>
      <a-form-item :label="t('Allocation.remark')">
        <a-textarea
          v-model:value="model.remark"
          :rows="3"
          :maxlength="255"
          show-count
        />
      </a-form-item>
    </SectionCard>
    <div class="allocation-footer">
      <a-button
        :disabled="busy"
        @click="emit('cancel')"
      >
        {{ t('Finance.cancel') }}
      </a-button>
      <j-permission-button
        type="primary"
        html-type="submit"
        hasPermission="charging/FinanceReceipt:allocation-save"
        :loading="busy"
      >
        {{ t('Finance.save') }}
      </j-permission-button>
    </div>
  </a-form>
</template>
