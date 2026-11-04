<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChargeSetting } from '../../../api/financeSetting'
const props = defineProps<{ detail: ChargeSetting }>()
const { t } = useI18n()
const items = computed(() => [
  { label: t('Setting.subject'), value: props.detail.subjectName },
  { label: t('Setting.standard'), value: props.detail.standardName },
  { label: t('Standard.standardCode'), value: props.detail.standardCode },
  { label: t('Setting.version'), value: String(props.detail.configVersion) },
  { label: t('Setting.start'), value: props.detail.effectiveStartDate },
  { label: t('Setting.end'), value: props.detail.effectiveEndDate || t('Setting.unlimited') }
])
const house = computed(() => [
  { label: t('Setting.house'), value: props.detail.snapshot.house.fullName },
  { label: t('Setting.billingArea'), value: String(props.detail.snapshot.house.billingArea) + ' m²' },
  { label: t('Setting.customer'), value: props.detail.customerName },
  { label: t('Setting.telephone'), value: props.detail.snapshot.customer.telephone || '—' },
  { label: t('Setting.family'), value: props.detail.snapshot.customer.familyName || '—' }
])
const rule = computed(() => props.detail.snapshot.standard)
const variables = computed(() =>
  rule.value.variablesSnapshot.map((row) => ({
    label: row.variableName,
    value:
      row.variableCode === 'PERIOD_MONTHS'
        ? t('Setting.periodCalculated')
        : props.detail.snapshot.values[row.variableCode] || '—'
  }))
)
</script>
<template>
  <div class="setting-detail">
    <div class="setting-detail-status">
      <a-tag :color="detail.status === 'ACTIVE' ? 'success' : 'default'">
        {{ t('Setting.status.' + detail.status) }}
      </a-tag>
      <span>{{ t(detail.billed ? 'Setting.billed' : 'Setting.unbilled') }}</span>
    </div>
    <SectionCard
      icon="HomeOutlined"
      :title="t('Setting.houseAndCustomer')"
    >
      <KvGrid
        :items="house"
        :gap="20"
      />
    </SectionCard>
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Setting.chargeRule')"
    >
      <KvGrid
        :items="items"
        :gap="20"
      />
    </SectionCard>
    <SectionCard
      icon="FunctionOutlined"
      :title="t('Setting.formula')"
    >
      <p class="setting-formula">{{ rule.formulaDisplay }}</p>
      <KvGrid
        :items="[
          { label: t('Standard.price'), value: rule.price || '—' },
          { label: t('Standard.settlementMethod'), value: t('Setting.' + rule.settlementMethod) },
          ...variables
        ]"
        :gap="20"
      />
    </SectionCard>
    <SectionCard
      v-if="detail.remark"
      icon="FileTextOutlined"
      :title="t('Setting.remark')"
    >
      <p>{{ detail.remark }}</p>
    </SectionCard>
  </div>
</template>
<style scoped>
.setting-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.setting-detail-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ant-color-text-secondary, #595959);
}
.setting-formula {
  margin: 0 0 20px;
  overflow-wrap: anywhere;
  line-height: 1.8;
}
@media (max-width: 560px) {
  .setting-detail :deep(.kv-grid) {
    grid-template-columns: 1fr !important;
  }
}
</style>
