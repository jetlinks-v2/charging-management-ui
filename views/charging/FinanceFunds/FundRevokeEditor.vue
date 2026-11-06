<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../components/FinanceAttachmentUpload.vue'
import type { FundRevokeDraft } from '../../../api/financeFundRevoke'
import { useFundRevoke } from '../../../hooks/finance-funds/useFundRevoke'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import '../FinanceCashier/cashier.css'
const props = defineProps<{ projectId: string; draft: FundRevokeDraft }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { confirmation, model, form, files, filesChanged, calculate } = useFundRevoke(props.projectId, props.draft, () =>
  emit('saved')
)
const { preview, result, saving, calculating, uncertain, failed, invalidate, submit } = confirmation
useProjectSwitchGuard(() => !!result.value)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
const summary = computed(() => [
  { label: t('Setting.house'), value: preview.value?.fullName || props.draft.entry?.fullName },
  { label: t('Setting.customer'), value: preview.value?.customerName || props.draft.entry?.customerName },
  { label: t('Setting.subject'), value: preview.value?.subjectName || props.draft.entry?.subjectName },
  { label: t('Cashier.company'), value: preview.value?.companyName || props.draft.entry?.companyName },
  { label: t('FundRevoke.original'), value: model.sourceEntryId },
  { label: t('FundRevoke.amount'), value: preview.value?.amount || props.draft.entry?.amount },
  { label: t('Cashier.method'), value: preview.value?.methodText || props.draft.entry?.methodText },
  { label: t('Funds.before'), value: preview.value?.beforeBalance || props.draft.account?.balance },
  ...(preview.value
    ? [
        { label: t('Funds.after'), value: preview.value.afterBalance },
        { label: t('Funds.cashAmount'), value: preview.value.cashAmount },
        { label: t('Funds.occurredAt'), value: formatFinanceTime(model.occurredAt) },
        { label: t('Funds.reason'), value: model.reason }
      ]
    : [])
])
function close() {
  if (!saving.value && !calculating.value && !uncertain.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="900"
    icon="RollbackOutlined"
    :title="t('FundRevoke.title')"
    @update:open="close"
  >
    <div class="cashier-editor">
      <template v-if="result">
        <div class="cashier-success">
          <AIcon type="CheckCircleFilled" />
          <div>
            <span>{{ t('FundRevoke.succeeded') }}</span>
            <strong class="cashier-money">{{ result.entry.amount }}</strong>
          </div>
        </div>
        <SectionCard
          icon="ProfileOutlined"
          :title="t('Funds.operationInfo')"
        >
          <KvGrid
            :cols="2"
            :items="[
              { label: t('Funds.transactionId'), value: result.entry.transactionId },
              { label: t('Setting.house'), value: result.entry.fullName },
              { label: t('Setting.customer'), value: result.entry.customerName },
              { label: t('Funds.cashAmount'), value: result.entry.cashAmount },
              { label: t('Funds.balance'), value: result.account.balance },
              { label: t('Funds.reason'), value: result.entry.reason }
            ]"
          />
        </SectionCard>
      </template>
      <template v-else>
        <a-steps
          size="small"
          :current="preview ? 1 : 0"
          :items="[{ title: t('Funds.fill') }, { title: t('Funds.review') }]"
        />
        <div
          v-if="preview"
          class="cashier-amount"
        >
          <span>{{ t('FundRevoke.amount') }}</span>
          <strong>{{ preview.amount }}</strong>
        </div>
        <SectionCard
          icon="ProfileOutlined"
          :title="t('FundRevoke.source')"
        >
          <KvGrid
            :cols="2"
            :items="summary"
          />
        </SectionCard>
        <template v-if="preview">
          <a-alert
            type="info"
            show-icon
            :message="t('FundRevoke.effect')"
          />
          <a-alert
            v-if="uncertain"
            type="warning"
            show-icon
            :message="t('Funds.unknown')"
          />
        </template>
        <a-form
          v-else
          ref="form"
          :model="model"
          layout="vertical"
          class="cashier-form"
          :disabled="saving || calculating || failed"
        >
          <SectionCard
            icon="RollbackOutlined"
            :title="t('FundRevoke.info')"
          >
            <div class="cashier-grid">
              <a-form-item
                :label="t('Funds.occurredAt')"
                name="occurredAt"
                :rules="required('Funds.occurredAt')"
              >
                <a-date-picker
                  v-model:value="model.occurredAt"
                  :show-time="{ format: 'HH:mm' }"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  format="YYYY-MM-DD HH:mm"
                />
              </a-form-item>
            </div>
            <a-form-item
              :label="t('Funds.reason')"
              name="reason"
              :rules="required('Funds.reason')"
            >
              <a-textarea
                v-model:value="model.reason"
                :maxlength="1000"
                :rows="3"
                show-count
              />
            </a-form-item>
            <a-form-item :label="t('FinanceAttachment.label')">
              <FinanceAttachmentUpload
                :value="files"
                :max-count="1"
                @upload-change="filesChanged"
              />
            </a-form-item>
          </SectionCard>
        </a-form>
      </template>
    </div>
    <template #foot>
      <a-button
        :disabled="saving || calculating || uncertain"
        @click="close"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="!result">
        <a-button
          v-if="preview"
          :disabled="saving || uncertain"
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
          {{ t(uncertain ? 'Cashier.retry' : 'FundRevoke.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="failed"
          @click="calculate"
        >
          {{ t('Funds.review') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
