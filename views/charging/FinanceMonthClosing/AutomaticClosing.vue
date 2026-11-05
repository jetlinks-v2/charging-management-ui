<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAutomaticClosing } from '../../../hooks/finance-month-closing/useAutomaticClosing'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const { t } = useI18n()
const { loading, saving, schedule, enabled, mode, day, reason, valid, load, save } = useAutomaticClosing(
  props.projectId,
  (value) => emit('busy', value)
)
</script>
<template>
  <a-spin
    :spinning="loading"
    class="auto-loading"
  >
    <a-form
      v-if="schedule"
      layout="vertical"
      class="automatic-form"
    >
      <div class="automatic-status">
        <div>
          <strong>{{ t('MonthClosing.auto.enabled') }}</strong>
          <p>{{ t('MonthClosing.auto.enabledHint') }}</p>
        </div>
        <a-switch
          v-model:checked="enabled"
          :disabled="saving"
          :aria-label="t('MonthClosing.auto.enabled')"
        />
      </div>
      <a-form-item :label="t('MonthClosing.auto.mode')">
        <a-radio-group
          v-model:value="mode"
          :disabled="saving"
        >
          <a-radio-button value="MONTH_END">{{ t('MonthClosing.auto.monthEnd') }}</a-radio-button>
          <a-radio-button value="DAY">{{ t('MonthClosing.auto.specifiedDay') }}</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item
        v-if="mode === 'DAY'"
        required
        :label="t('MonthClosing.auto.day')"
      >
        <a-input-number
          v-model:value="day"
          :min="1"
          :max="28"
          :precision="0"
          :disabled="saving"
          :aria-label="t('MonthClosing.auto.day')"
        />
      </a-form-item>
      <p class="automatic-hint">
        {{ t(mode === 'MONTH_END' ? 'MonthClosing.auto.monthEndHint' : 'MonthClosing.auto.dayHint') }}
      </p>
      <a-form-item
        required
        :label="t('MonthClosing.reason')"
      >
        <a-textarea
          v-model:value="reason"
          :rows="2"
          :maxlength="1000"
          :disabled="saving"
          show-count
          :aria-label="t('MonthClosing.reason')"
        />
      </a-form-item>
      <div class="automatic-actions">
        <a-button
          :disabled="saving"
          @click="load"
        >
          {{ t('Finance.refresh') }}
        </a-button>
        <j-permission-button
          type="primary"
          hasPermission="charging/FinanceMonthClosing:save"
          :loading="saving"
          :disabled="!valid"
          @click="save"
        >
          {{ t('Finance.save') }}
        </j-permission-button>
      </div>
    </a-form>
    <CloudEmpty
      v-else-if="!loading"
      :description="t('MonthClosing.ruleFailed')"
    >
      <a-button @click="load">{{ t('Finance.refresh') }}</a-button>
    </CloudEmpty>
  </a-spin>
</template>
<style scoped>
.auto-loading {
  display: block;
  min-height: 220px;
}
.automatic-form {
  max-width: 640px;
}
.automatic-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 4px 0 24px;
}
.automatic-status p,
.automatic-hint {
  color: var(--ant-color-text-secondary, #595959);
  margin: 6px 0 0;
  line-height: 1.7;
}
.automatic-hint {
  margin: -8px 0 20px;
}
.automatic-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
