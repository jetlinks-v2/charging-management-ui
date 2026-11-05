<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { usePrepay } from '../../../../hooks/finance-prepay/usePrepay'
const props = defineProps<{ state: ReturnType<typeof usePrepay> }>()
const { model, settings, setting, activity, chooseSetting } = props.state
const { t } = useI18n()
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Prepay.selection')"
  >
    <a-form
      :model="model"
      layout="vertical"
      :disabled="state.calculating.value || state.loading.value"
    >
      <a-form-item
        :label="t('Prepay.setting')"
        name="settingId"
        required
      >
        <a-select
          :value="model.settingId || undefined"
          :placeholder="t('Prepay.chooseSetting')"
          :options="settings.map((item) => ({ value: item.id, label: `${item.subjectName} · ${item.standardName}` }))"
          @change="(value) => chooseSetting(String(value))"
        />
      </a-form-item>
      <div class="cashier-grid">
        <a-form-item
          :label="t('Cashier.selectedPayer')"
          name="payerRelationshipId"
          required
        >
          <a-select
            v-model:value="model.payerRelationshipId"
            :placeholder="t('Cashier.choosePayer')"
            :options="setting?.payers.map((payer) => ({ value: payer.relationshipId, label: payer.name })) || []"
          />
        </a-form-item>
        <a-form-item
          :label="t('Prepay.activity')"
          name="activityId"
        >
          <a-select
            :value="model.activityId"
            @change="
              (value) => {
                model.activityId = String(value)
                model.tierIndex = undefined
              }
            "
            :options="[
              { value: '', label: t('Prepay.ordinary') },
              ...(setting?.activities.map((item) => ({ value: item.id, label: item.name })) || [])
            ]"
          />
        </a-form-item>
        <a-form-item
          v-if="activity"
          :label="t('Prepay.tier')"
          name="tierIndex"
          required
        >
          <a-select
            v-model:value="model.tierIndex"
            :placeholder="t('Prepay.chooseTier')"
            :options="activity.tiers.map((tier, index) => ({ value: index, label: t('Prepay.tierLabel', tier) }))"
          />
        </a-form-item>
        <a-form-item
          v-else
          :label="t('Activity.paidMonths')"
          name="paidMonths"
          required
        >
          <a-input-number
            v-model:value="model.paidMonths"
            :min="1"
            :max="1200"
            :precision="0"
            :step="setting?.settlementMethod === 'QUARTERLY' ? 3 : 1"
          />
        </a-form-item>
      </div>
      <p
        v-if="setting?.settlementMethod === 'QUARTERLY'"
        class="subject-caption"
      >
        {{ t('Activity.quarterHint') }}
      </p>
    </a-form>
  </SectionCard>
</template>
