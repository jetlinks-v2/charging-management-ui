<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useCashier } from '../../../hooks/finance-cashier/useCashier'
const props = defineProps<{
  compact?: boolean
  single?: boolean
  state: Pick<ReturnType<typeof useCashier>, 'funding' | 'total' | 'tenderTotal' | 'balanced' | 'addTender'> & {
    model: { tenders: { optionId: string; amount: string }[] }
  }
}>()
const { model, funding, total, tenderTotal, balanced, addTender } = props.state
const { t } = useI18n()
const options = computed(() =>
  funding.value.map((option) => ({
    value: option.id,
    label: option.bankName ? `${option.text} · ${option.bankName}` : option.text
  }))
)
</script>
<template>
  <SectionCard
    icon="WalletOutlined"
    :title="t('Cashier.funding')"
  >
    <div
      v-for="(tender, index) in model.tenders"
      :key="index"
      class="cashier-tender"
      :class="{ 'cashier-tender-single': single }"
    >
      <a-form-item
        :label="t('Cashier.method')"
        :name="['tenders', index, 'optionId']"
        :rules="[{ required: true, message: t('Cashier.chooseFunding') }]"
      >
        <a-select
          v-model:value="tender.optionId"
          :options="
            options.filter(
              (option) =>
                option.value === tender.optionId || !model.tenders.some((item) => item.optionId === option.value)
            )
          "
        />
      </a-form-item>
      <a-form-item
        :label="t('Cashier.tenderAmount')"
        :name="['tenders', index, 'amount']"
        :rules="[{ required: true, message: t('Cashier.requiredAmount') }]"
      >
        <a-input-number
          v-if="!single"
          v-model:value="tender.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
          :max="'999999999999999999.99'"
        />
        <strong
          v-else
          class="cashier-fixed-tender cashier-money"
        >
          {{ tender.amount }}
        </strong>
      </a-form-item>
      <a-button
        v-if="!single && (!compact || model.tenders.length > 1)"
        :disabled="model.tenders.length === 1"
        type="text"
        :aria-label="t('Cashier.removeTender')"
        @click="model.tenders.splice(index, 1)"
      >
        <AIcon type="DeleteOutlined" />
      </a-button>
    </div>
    <div
      v-if="!single && (!compact || funding.length > 1 || !balanced)"
      class="cashier-funding-footer"
    >
      <a-button
        v-if="!compact || funding.length > 1"
        type="dashed"
        :disabled="model.tenders.length >= funding.length || model.tenders.length >= 10"
        @click="addTender"
      >
        <AIcon type="PlusOutlined" />
        {{ t('Cashier.addTender') }}
      </a-button>
      <span
        v-if="!compact || !balanced"
        :class="{ 'cashier-unbalanced': !balanced }"
      >
        {{ t('Cashier.fundingTotal') }}
        <strong>{{ tenderTotal }}</strong>
        / {{ total }}
      </span>
    </div>
  </SectionCard>
</template>
