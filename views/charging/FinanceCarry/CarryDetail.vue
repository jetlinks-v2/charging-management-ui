<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CarryPlan, CarrySubject } from '../../../api/financeCarry'
const props = defineProps<{ detail: CarryPlan; subjects: CarrySubject[] }>()
const { t } = useI18n()
const input = computed(() => props.detail.input)
const selection = computed(() =>
  input.value.subjectIds
    .map((id) => props.subjects.find((row) => row.id === id)?.name || t('Carry.unavailableSubject'))
    .join('、')
)
</script>
<template>
  <div class="carry-detail">
    <div class="carry-detail-heading">
      <h2>{{ input.name }}</h2>
      <a-tag :color="input.enabled ? 'green' : undefined">
        {{ t(input.enabled ? 'Carry.enabledState' : 'Carry.disabledState') }}
      </a-tag>
    </div>
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Carry.scope')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Carry.subjects'), value: selection },
          { label: t('Carry.period'), value: input.periodStart + ' ~ ' + input.periodEnd }
        ]"
      />
    </SectionCard>
    <SectionCard
      icon="ClockCircleOutlined"
      :title="t('Carry.schedule')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Carry.frequency'), value: t('Carry.' + input.frequency) },
          {
            label: t('Carry.executeDay'),
            value:
              input.frequency === 'DAILY'
                ? t('Carry.DAILY')
                : input.frequency === 'WEEKLY'
                  ? t('Carry.week' + input.executeDay)
                  : input.frequency === 'MONTHLY'
                    ? t('Carry.day', { day: input.executeDay })
                    : input.executeDay
          },
          { label: t('Carry.executeAt'), value: input.executeAt },
          { label: t('Carry.zone'), value: input.zone }
        ]"
      />
    </SectionCard>
    <SectionCard
      icon="AccountBookOutlined"
      :title="t('Carry.paymentRules')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Carry.includeLateFee'), value: t(input.includeLateFee ? 'Carry.yes' : 'Carry.no') },
          { label: t('Carry.remissionMode'), value: t('Carry.' + input.remissionMode) },
          ...(input.remissionMode === 'NONE' ? [] : [{ label: t('Carry.remissionValue'), value: input.remissionValue }])
        ]"
      />
    </SectionCard>
  </div>
</template>
<style scoped>
.carry-detail {
  display: grid;
  gap: 20px;
}
.carry-detail-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.carry-detail-heading h2 {
  margin: 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}
</style>
