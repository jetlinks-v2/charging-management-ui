<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FinanceAttachmentUpload from '../components/FinanceAttachmentUpload.vue'
import type { FundReturnDraft } from '../../../api/financeFundReturn'
import { useFundReturn } from '../../../hooks/finance-funds/useFundReturn'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import '../FinanceCashier/cashier.css'
const props = defineProps<{ projectId: string; draft: FundReturnDraft }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const { confirmation, model, form, files, filesChanged, calculate } = useFundReturn(props.projectId, props.draft, () =>
  emit('saved')
)
const { preview, result, saving, calculating, uncertain, failed, invalidate, submit } = confirmation
useProjectSwitchGuard(() => !!result.value)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
const summary = computed(() => [
  { label: t('Setting.house'), value: preview.value?.fullName || props.draft.account?.fullName },
  { label: t('Setting.customer'), value: preview.value?.customerName || props.draft.account?.customerName },
  { label: t('Setting.subject'), value: preview.value?.subjectName || props.draft.account?.subjectName },
  { label: t('Cashier.company'), value: preview.value?.companyName || props.draft.account?.companyName },
  { label: t('FundReturn.original'), value: model.sourceEntryId },
  { label: t('Funds.before'), value: preview.value?.beforeBalance || props.draft.account?.balance },
  ...(preview.value
    ? [
        { label: t('Funds.after'), value: preview.value.afterBalance },
        { label: t('Funds.occurredAt'), value: model.occurredAt.replace('T', ' ') },
        { label: t('Funds.reason'), value: model.reason }
      ]
    : [])
])
const columns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 220 },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 150 },
  { title: t('FundReturn.restoreDebt'), dataIndex: 'amount', width: 150, align: 'right' },
  { title: t('FundReturn.billId'), dataIndex: 'receivableId', width: 300 }
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
    :title="t('FundReturn.title')"
    @update:open="close"
  >
    <div class="cashier-editor">
      <template v-if="result">
        <div class="cashier-success">
          <AIcon type="CheckCircleFilled" />
          <div>
            <span>{{ t('FundReturn.succeeded') }}</span>
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
              { label: t('Setting.house'), value: result.account.fullName },
              { label: t('Setting.customer'), value: result.account.customerName },
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
          <span>{{ t('FundReturn.amount') }}</span>
          <strong>{{ preview.amount }}</strong>
        </div>
        <SectionCard
          icon="ProfileOutlined"
          :title="t('FundReturn.source')"
        >
          <KvGrid
            :cols="2"
            :items="summary"
          />
        </SectionCard>
        <template v-if="preview">
          <SectionCard
            icon="UnorderedListOutlined"
            :title="t('FundReturn.bills')"
          >
            <a-table
              :columns="columns"
              :data-source="preview.allocations"
              row-key="sourceLineId"
              size="small"
              :pagination="false"
              :scroll="{ x: 820 }"
            />
          </SectionCard>
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
            :title="t('FundReturn.info')"
          >
            <div class="cashier-grid">
              <a-form-item
                :label="t('FundReturn.amount')"
                name="amount"
                :rules="required('FundReturn.amount')"
              >
                <a-input-number
                  v-model:value="model.amount"
                  string-mode
                  :precision="2"
                  :min="'0.01'"
                />
              </a-form-item>
              <a-form-item
                :label="t('Funds.occurredAt')"
                name="occurredAt"
                :rules="required('Funds.occurredAt')"
              >
                <a-date-picker
                  v-model:value="model.occurredAt"
                  show-time
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  format="YYYY-MM-DD HH:mm:ss"
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
          {{ t(uncertain ? 'Cashier.retry' : 'FundReturn.confirm') }}
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
