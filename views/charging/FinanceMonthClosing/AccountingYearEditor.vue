<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AccountingPeriod } from '../../../api/financeAccounting'
import { useAccountingEditor } from '../../../hooks/finance-month-closing/useAccountingEditor'
const props = defineProps<{ projectId: string; year: number; mode: 'create' | 'edit'; periods: AccountingPeriod[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const {
  rows,
  mode: calendarMode,
  openingDay,
  saving,
  reason,
  validDates,
  valid,
  save
} = useAccountingEditor(props, () => emit('saved'))
const close = () => {
  if (!saving.value) emit('close')
}
</script>
<template>
  <a-modal
    :open="true"
    :width="mode === 'edit' ? 780 : 520"
    :footer="null"
    :title="t(mode === 'create' ? 'MonthClosing.createYear' : 'MonthClosing.editYear') + ' · ' + year"
    :closable="!saving"
    :mask-closable="false"
    :keyboard="!saving"
    @cancel="close"
  >
    <a-form layout="vertical">
      <template v-if="mode === 'create'">
        <a-form-item :label="t('MonthClosing.calendarMode')">
          <a-radio-group
            v-model:value="calendarMode"
            :disabled="saving"
          >
            <a-radio value="NATURAL">{{ t('MonthClosing.natural') }}</a-radio>
            <a-radio value="CUSTOM">{{ t('MonthClosing.custom') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="calendarMode === 'CUSTOM'"
          :label="t('MonthClosing.openingDay')"
          :extra="t('MonthClosing.customHint')"
        >
          <a-input-number
            v-model:value="openingDay"
            :disabled="saving"
            :min="1"
            :max="28"
            :precision="0"
          />
        </a-form-item>
      </template>
      <template v-else>
        <p>{{ t('MonthClosing.editHint') }}</p>
        <div class="year-table-wrap">
          <a-table
            :data-source="rows"
            :pagination="false"
            row-key="id"
            size="small"
            :scroll="{ x: 620 }"
          >
            <a-table-column
              key="month"
              :title="t('MonthClosing.period')"
              data-index="accountMonth"
              :width="110"
            />
            <a-table-column
              key="start"
              :title="t('MonthClosing.startDate')"
              :width="210"
            >
              <template #default="{ record }">
                <a-date-picker
                  v-model:value="record.startDate"
                  value-format="YYYY-MM-DD"
                  :allow-clear="false"
                  :disabled="saving || record.status === 'CLOSED'"
                  :aria-label="record.accountMonth + t('MonthClosing.startDate')"
                />
              </template>
            </a-table-column>
            <a-table-column
              key="end"
              :title="t('MonthClosing.endDate')"
              :width="210"
            >
              <template #default="{ record }">
                <a-date-picker
                  v-model:value="record.endDate"
                  value-format="YYYY-MM-DD"
                  :allow-clear="false"
                  :disabled="saving || record.status === 'CLOSED'"
                  :aria-label="record.accountMonth + t('MonthClosing.endDate')"
                />
              </template>
            </a-table-column>
            <a-table-column
              key="status"
              :title="t('MonthClosing.state')"
              :width="90"
            >
              <template #default="{ record }">
                <a-tag :color="record.status === 'CLOSED' ? 'green' : 'default'">
                  {{ t('MonthClosing.status.' + record.status) }}
                </a-tag>
              </template>
            </a-table-column>
          </a-table>
        </div>
        <p
          v-if="!validDates"
          class="year-date-error"
          role="status"
        >
          {{ t('MonthClosing.invalidDates') }}
        </p>
        <a-form-item
          required
          :label="t('MonthClosing.reason')"
          class="year-reason"
        >
          <a-textarea
            v-model:value="reason"
            :disabled="saving"
            :rows="2"
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </template>
    </a-form>
    <div class="year-footer">
      <a-button
        :disabled="saving"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <j-permission-button
        type="primary"
        :hasPermission="'charging/FinanceMonthClosing:' + (mode === 'create' ? 'create' : 'edit')"
        :loading="saving"
        :disabled="!valid"
        @click="save"
      >
        {{ t('Finance.save') }}
      </j-permission-button>
    </div>
  </a-modal>
</template>
<style scoped>
.year-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.year-table-wrap {
  overflow-x: auto;
}
.year-date-error {
  color: var(--ant-color-error-text, #a8071a);
  margin: 12px 0;
}
.year-reason {
  margin-top: 20px;
}
</style>
