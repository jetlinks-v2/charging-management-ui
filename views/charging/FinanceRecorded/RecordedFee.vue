<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RecordedInput } from '../../../api/financeRecorded'
import { useRecordedFeeInputs } from '../../../hooks/finance-recorded/useRecordedFeeInputs'
const props = defineProps<{ model: RecordedInput; readOnly: boolean; disabled: boolean }>()
const numeric = useRecordedFeeInputs(() => props.model)
const emit = defineEmits<{ changeType: [1 | 2 | null]; add: []; remove: [number] }>()
const { t } = useI18n()
</script>
<template>
  <section class="recorded-fee">
    <h3 class="finance-section-title">{{ t('Recorded.fee') }}</h3>
    <a-form-item
      v-if="!readOnly"
      :label="t('Recorded.feeTypeLabel')"
    >
      <a-radio-group
        :value="model.serviceChargeType ?? 0"
        :disabled="disabled"
        @change="emit('changeType', $event.target.value || null)"
      >
        <a-radio :value="0">{{ t('Recorded.feeType.none') }}</a-radio>
        <a-radio :value="1">{{ t('Recorded.feeType.1') }}</a-radio>
        <a-radio :value="2">{{ t('Recorded.feeType.2') }}</a-radio>
      </a-radio-group>
    </a-form-item>
    <p v-else>{{ t('Recorded.feeType.' + (model.serviceChargeType ?? 'none')) }}</p>
    <template v-if="model.serviceChargeType === 2">
      <p v-if="readOnly">{{ t('Recorded.fixedAmount') }}：{{ model.fixedAmount?.toFixed(2) }}</p>
      <a-form-item
        v-else
        :label="t('Recorded.fixedAmount')"
        name="fixedAmount"
        :rules="[{ required: true, message: t('Recorded.feeRequired') }]"
      >
        <a-input-number
          :value="model.fixedAmount ?? undefined"
          :min="0"
          :precision="2"
          :disabled="disabled"
          @update:value="numeric.fixed"
        />
      </a-form-item>
    </template>
    <template v-if="model.serviceChargeType === 1">
      <div class="finance-form-grid">
        <a-form-item
          v-for="field in ['minimumFee', 'maximumFee'] as const"
          :key="field"
          :label="t('Recorded.' + field)"
        >
          <span v-if="readOnly">{{ model[field]?.toFixed(2) ?? '—' }}</span>
          <a-input-number
            v-else
            :value="model[field] ?? undefined"
            :min="0"
            :precision="2"
            :disabled="disabled"
            @update:value="numeric[field === 'minimumFee' ? 'minimum' : 'maximum']"
          />
        </a-form-item>
      </div>
      <p>{{ t('Recorded.tierHint') }}</p>
      <div class="recorded-tiers">
        <div class="recorded-tier-header">
          <span>{{ t('Recorded.minimumAmount') }}</span>
          <span>{{ t('Recorded.maximumAmount') }}</span>
          <span>{{ t('Recorded.procedureRate') }}</span>
          <span />
        </div>
        <div
          v-for="(tier, index) in model.tiers"
          :key="index"
          class="recorded-tier-row"
        >
          <span>{{ index ? (model.tiers[index - 1].maximumAmount ?? '—') : '0.00' }}</span>
          <span v-if="readOnly">{{ tier.maximumAmount?.toFixed(2) ?? t('Recorded.unlimited') }}</span>
          <a-input-number
            v-else
            :value="tier.maximumAmount ?? undefined"
            :min="tier.minimumAmount + 0.01"
            :precision="2"
            :disabled="disabled"
            :placeholder="t('Recorded.unlimited')"
            :aria-label="t('Recorded.maximumAmount')"
            @update:value="numeric.upper(tier, $event)"
          />
          <span v-if="readOnly">{{ tier.procedureRate }}%</span>
          <a-input-number
            v-else
            :value="tier.procedureRate ?? undefined"
            :min="0"
            :max="100"
            :precision="6"
            :disabled="disabled"
            :aria-label="t('Recorded.procedureRate')"
            @update:value="numeric.rate(tier, $event)"
          />
          <a-button
            v-if="!readOnly && model.tiers.length > 1"
            type="text"
            danger
            :disabled="disabled"
            :aria-label="t('Recorded.removeTier')"
            @click="emit('remove', index)"
          >
            <AIcon type="DeleteOutlined" />
          </a-button>
        </div>
      </div>
      <a-button
        v-if="!readOnly"
        type="dashed"
        :disabled="disabled || model.tiers.length >= 50 || model.tiers.at(-1)?.maximumAmount == null"
        @click="emit('add')"
      >
        <AIcon type="PlusOutlined" />
        {{ t('Recorded.addTier') }}
      </a-button>
    </template>
  </section>
</template>
<style scoped>
.recorded-fee {
  margin-top: 24px;
}
.recorded-tiers {
  overflow-x: auto;
  margin-bottom: 12px;
}
.recorded-tier-header,
.recorded-tier-row {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 40px;
  gap: 12px;
  align-items: center;
  min-width: 440px;
  padding: 8px 0;
}
.recorded-tier-header {
  color: var(--ink-3);
}
.recorded-tier-row {
  border-top: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.recorded-tier-row .ant-input-number {
  width: 100%;
}
</style>
