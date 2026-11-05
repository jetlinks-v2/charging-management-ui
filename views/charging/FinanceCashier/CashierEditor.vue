<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CashierReduction } from '../../../utils/cashierTree'
import type { Receivable } from '../../../api/financeReceivable'
import { FileUpload } from '@jetlinks-web-core/components'
import { useCashier } from '../../../hooks/finance-cashier/useCashier'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import { useCollectionRecovery } from '../../../hooks/finance-cashier/useCollectionRecovery'
import CashierBills from './CashierBills.vue'
import CashierFunding from './CashierFunding.vue'
import PaymentSummary from './PaymentSummary.vue'
import './cashier.css'
const props = defineProps<{ projectId: string; rows: Receivable[]; reduction?: CashierReduction }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useCashier(
  props,
  () => emit('saved'),
  useCollectionRecovery(() => props.projectId)
)
const {
  model,
  form,
  companies,
  payers,
  total,
  loading,
  calculating,
  saving,
  uncertain,
  preview,
  result,
  files,
  uploading,
  invalidFiles,
  chooseCompany,
  choosePayer,
  filesChanged,
  calculate,
  submit,
  invalidate
} = state
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uploading.value && !uncertain.value) emit('close')
}
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="960"
    icon="WalletOutlined"
    :title="t(result ? 'Cashier.paymentInfo' : 'Cashier.collect')"
    :sub="rows.length === 1 ? rows[0].fullName : t('Receivable.selectedCount', { count: rows.length })"
    @update:open="close"
  >
    <div class="cashier-editor">
      <PaymentSummary
        v-if="result"
        :detail="result"
      />
      <template v-else>
        <a-steps
          :current="preview ? 1 : 0"
          size="small"
          :items="[{ title: t('Cashier.edit') }, { title: t('Cashier.confirmTitle') }]"
        />
        <template v-if="preview">
          <div class="cashier-amount">
            <span>{{ t('Cashier.total') }}</span>
            <strong>{{ preview.total }}</strong>
          </div>
          <SectionCard
            icon="ProfileOutlined"
            :title="t('Cashier.paymentInfo')"
          >
            <KvGrid
              :cols="2"
              :items="[
                { label: t('Cashier.company'), value: preview.companyName },
                { label: t('Cashier.payer'), value: preview.payerName },
                { label: t('Cashier.paidAt'), value: model.paidAt.replace('T', ' ') },
                { label: t('Setting.remark'), value: model.remark || '—' }
              ]"
            />
          </SectionCard>
          <SectionCard
            icon="UnorderedListOutlined"
            :title="t('Cashier.bills')"
          >
            <CashierBills
              :rows="preview.rows"
              :amounts="model.items"
            />
          </SectionCard>
          <SectionCard
            icon="WalletOutlined"
            :title="t('Cashier.funding')"
          >
            <div
              v-for="(tender, index) in model.tenders"
              :key="index"
              class="cashier-preview-tender"
            >
              <span>
                {{
                  state.funding.value.find((item) => item.id === tender.optionId)?.text ||
                  preview.allocations.find((item) => item.tenderIndex === index)?.methodText
                }}
                <small>
                  {{
                    state.funding.value.find((item) => item.id === tender.optionId)?.bankName ||
                    preview.allocations.find((item) => item.tenderIndex === index)?.bankName
                  }}
                </small>
              </span>
              <strong>{{ tender.amount }}</strong>
            </div>
          </SectionCard>
          <a-alert
            v-if="uncertain"
            type="warning"
            show-icon
            :message="t('Cashier.unknownResult')"
          />
        </template>
        <a-spin
          v-else
          :spinning="loading"
        >
          <a-form
            ref="form"
            :model="model"
            layout="vertical"
            :disabled="calculating || saving || loading"
            class="cashier-form"
          >
            <SectionCard
              icon="UnorderedListOutlined"
              :title="t('Cashier.bills')"
            >
              <CashierBills
                :rows="rows"
                :amounts="model.items"
                editable
                @amount="(index, value) => (model.items[index].amount = value)"
              />
              <div
                v-if="model.reduction"
                class="cashier-reduction-info"
              >
                {{ t('CashierDesk.reductionApplied') }} · {{ model.reduction.reason }}
              </div>
              <div class="cashier-inline-total">
                {{ t('Cashier.total') }}
                <strong>{{ total }}</strong>
              </div>
            </SectionCard>
            <SectionCard
              icon="ProfileOutlined"
              :title="t('Cashier.paymentInfo')"
            >
              <div class="cashier-grid">
                <a-form-item
                  :label="t('Cashier.company')"
                  name="companyId"
                  :rules="required('Cashier.company')"
                >
                  <a-select
                    :value="model.companyId || undefined"
                    :disabled="companies.length === 1"
                    :options="companies.map((item) => ({ value: item.id, label: item.name }))"
                    :placeholder="t('Cashier.chooseCompany')"
                    @change="(value) => chooseCompany(String(value))"
                  />
                </a-form-item>
                <a-form-item
                  :label="t('Cashier.paidAt')"
                  name="paidAt"
                  :rules="required('Cashier.paidAt')"
                >
                  <a-date-picker
                    v-model:value="model.paidAt"
                    show-time
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    format="YYYY-MM-DD HH:mm:ss"
                  />
                </a-form-item>
                <a-form-item
                  :label="t('Cashier.selectedPayer')"
                  name="payerRelationshipId"
                  :rules="required('Cashier.selectedPayer')"
                >
                  <a-select
                    :value="model.payerRelationshipId"
                    :options="
                      payers.map((item) => ({
                        value: item.relationshipId,
                        label: item.name
                      }))
                    "
                    :placeholder="t('Cashier.choosePayer')"
                    @change="(value) => choosePayer(value ? String(value) : undefined)"
                  />
                </a-form-item>
                <a-form-item
                  :label="t('Cashier.payer')"
                  name="payerName"
                  :rules="required('Cashier.payer')"
                >
                  <a-input
                    v-model:value="model.payerName"
                    :maxlength="128"
                    disabled
                  />
                </a-form-item>
              </div>
            </SectionCard>
            <CashierFunding :state="state" />
            <SectionCard
              icon="PaperClipOutlined"
              :title="t('Cashier.supplement')"
            >
              <a-form-item :label="t('Setting.remark')">
                <a-textarea
                  v-model:value="model.remark"
                  :maxlength="1000"
                  :rows="2"
                  show-count
                />
              </a-form-item>
              <a-form-item :label="t('Cashier.attachmentHint')">
                <FileUpload
                  :value="files"
                  :size="20"
                  :max-count="1"
                  :disabled="calculating || saving"
                  :btn-text="t('Adjustment.upload')"
                  @upload-change="filesChanged"
                />
              </a-form-item>
            </SectionCard>
          </a-form>
        </a-spin>
      </template>
    </div>
    <template #foot>
      <a-button
        :disabled="saving || calculating || uploading || uncertain"
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
          {{ t(uncertain ? 'Cashier.retry' : 'Cashier.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="loading || uploading || invalidFiles || state.recoveryFailed.value || !state.balanced.value"
          @click="calculate"
        >
          {{ t('Cashier.preview') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
