<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { Receivable } from '../../../api/financeReceivable'
import { useReceivableSplit } from '../../../hooks/finance-receivable/useReceivableSplit'
const props = defineProps<{ projectId: string; detail: Receivable }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const {
  model,
  form,
  options,
  preview,
  loading,
  failed,
  calculating,
  saving,
  lastDate,
  load,
  calculate,
  submit,
  invalidate
} = useReceivableSplit(props, () => emit('saved'))
const customers = computed(() => options.value.map((row) => ({ value: row.relationshipId, label: row.name })))
const required = (field: string) => [{ required: true, message: t('Finance.required', { field: t(field) }) }]
function close() {
  if (!saving.value && !calculating.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="800"
    icon="PartitionOutlined"
    :title="t('Split.title')"
    :sub="detail.fullName"
    @update:open="close"
  >
    <div class="adjustment-workspace">
      <div class="adjustment-context">
        <a-tag color="processing">{{ t('Receivable.status.' + detail.periodStatus) }}</a-tag>
        <span>{{ detail.subjectName }} · {{ detail.customerName }}</span>
      </div>
      <a-steps
        :current="preview ? 1 : 0"
        size="small"
        :items="[{ title: t('Split.edit') }, { title: t('Adjustment.confirmTitle') }]"
      />
      <a-skeleton
        v-if="loading"
        active
        :paragraph="{ rows: 8 }"
      />
      <div
        v-else-if="failed"
        class="split-retry"
      >
        <CloudEmpty :description="t('Finance.detailFailed')" />
        <a-button @click="load">{{ t('Finance.refresh') }}</a-button>
      </div>
      <template v-else-if="preview">
        <p class="adjustment-note">{{ t('Split.confirmHint') }}</p>
        <section
          v-for="(part, index) in preview.parts"
          :key="part.start"
          class="split-part"
        >
          <div class="split-part-heading">
            <strong>{{ t(index === 0 ? 'Split.first' : 'Split.second') }}</strong>
            <strong class="split-amount">
              {{ part.amount }}
              <small>{{ t('Split.yuan') }}</small>
            </strong>
          </div>
          <KvGrid
            :cols="2"
            :items="[
              { label: t('Setting.customer'), value: part.customerName },
              { label: t('Receivable.coverage'), value: part.start + ' ～ ' + part.end }
            ]"
          />
        </section>
        <div class="split-total">
          <span>{{ t('Split.total') }}</span>
          <strong>{{ preview.total }} {{ t('Split.yuan') }}</strong>
        </div>
        <p class="adjustment-note">{{ t('Receivable.reason') }}：{{ model.reason }}</p>
      </template>
      <a-form
        v-else
        ref="form"
        :model="model"
        layout="vertical"
        :disabled="calculating || saving"
        class="adjustment-form"
      >
        <SectionCard
          icon="AccountBookOutlined"
          :title="t('Split.original')"
        >
          <KvGrid
            :cols="2"
            :items="[
              {
                label: t('Receivable.actualReceivableAmount'),
                value: detail.actualReceivableAmount + ' ' + t('Split.yuan')
              },
              { label: t('Receivable.coverage'), value: detail.calcStartDate + ' ～ ' + detail.calcEndDate },
              { label: t('Split.accruedThrough'), value: lastDate }
            ]"
          />
        </SectionCard>
        <SectionCard
          icon="CalendarOutlined"
          :title="t('Split.rules')"
        >
          <p class="adjustment-note">{{ t('Split.dateHint') }}</p>
          <div class="adjustment-grid">
            <a-form-item
              :label="t('Split.date')"
              name="splitDate"
              :rules="required('Split.date')"
            >
              <a-date-picker
                v-model:value="model.splitDate"
                :default-picker-value="dayjs(detail.calcStartDate)"
                :placeholder="t('Split.selectDate')"
                value-format="YYYY-MM-DD"
                :disabled-date="
                  (date) => date.format('YYYY-MM-DD') < detail.calcStartDate || date.format('YYYY-MM-DD') >= lastDate
                "
              />
            </a-form-item>
            <a-form-item
              :label="t('Split.scale')"
              name="scale"
              :rules="required('Split.scale')"
            >
              <a-select
                v-model:value="model.scale"
                :options="[0, 1, 2].map((value) => ({ value, label: t('Split.scale' + value) }))"
              />
            </a-form-item>
            <a-form-item
              :label="t('Split.firstCustomer')"
              name="firstRelationshipId"
              :rules="required('Split.firstCustomer')"
            >
              <a-select
                v-model:value="model.firstRelationshipId"
                :options="customers"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
            <a-form-item
              :label="t('Split.secondCustomer')"
              name="secondRelationshipId"
              :rules="required('Split.secondCustomer')"
            >
              <a-select
                v-model:value="model.secondRelationshipId"
                :options="customers"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
          </div>
          <a-form-item
            :label="t('Receivable.reason')"
            name="reason"
            :rules="[{ required: true, whitespace: true, message: t('Receivable.reasonRequired') }]"
          >
            <a-textarea
              v-model:value="model.reason"
              :maxlength="1000"
              :rows="3"
              show-count
            />
          </a-form-item>
        </SectionCard>
      </a-form>
    </div>
    <template #foot>
      <a-button
        :disabled="saving || calculating"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <a-button
        v-if="preview"
        :disabled="saving"
        @click="invalidate"
      >
        {{ t('Adjustment.back') }}
      </a-button>
      <a-button
        v-if="preview"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ t('Split.confirm') }}
      </a-button>
      <a-button
        v-else
        type="primary"
        :loading="calculating"
        :disabled="loading || failed"
        @click="calculate"
      >
        {{ t('Adjustment.preview') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>
<style src="./adjustment.css"></style>
<style scoped>
.split-part {
  padding: 0 0 24px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.split-part-heading,
.split-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 20px;
}
.split-amount,
.split-total strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.split-amount small {
  font-size: 14px;
  font-weight: 400;
}
.split-retry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
@media (max-width: 560px) {
  .split-part-heading {
    flex-wrap: wrap;
  }
  .split-amount,
  .split-total strong {
    font-size: 20px;
  }
}
</style>
