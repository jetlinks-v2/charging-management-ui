<script setup lang="ts">
import { computed } from 'vue'
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
import CollectionPreview from './collection/CollectionPreview.vue'
import './cashier.css'
import './collection-modal.css'
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
  choosePayer,
  filesChanged,
  calculate,
  submit,
  invalidate
} = state
const sameHouse = computed(() => rowsInSameHouse(props.rows))
function rowsInSameHouse(rows: Receivable[]) {
  return !!rows[0]?.spaceId && rows.every((row) => row.spaceId === rows[0].spaceId)
}
const locked = computed(() => saving.value || calculating.value || uploading.value || uncertain.value)
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uploading.value && !uncertain.value) emit('close')
}
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t(key) }) }]
</script>
<template>
  <a-modal
    open
    centered
    :width="1000"
    :style="{ maxWidth: 'calc(100vw - 2rem)' }"
    :body-style="{ maxHeight: 'calc(100dvh - 13rem)', overflowY: 'auto' }"
    wrap-class-name="cashier-collection-modal"
    :mask-closable="false"
    :closable="!locked"
    :keyboard="!locked"
    @cancel="close"
  >
    <template #title>
      <div>{{ t(result ? 'Cashier.paymentInfo' : preview ? 'Cashier.confirmTitle' : 'Cashier.collect') }}</div>
      <div class="cashier-dialog-context">
        {{ sameHouse ? rows[0].fullName : t('Receivable.selectedCount', { count: rows.length }) }}
      </div>
    </template>
    <div class="cashier-editor cashier-collection-body">
      <PaymentSummary
        v-if="result"
        :detail="result"
      />
      <template v-else>
        <CollectionPreview
          v-if="preview"
          :state="state"
          :hide-house="sameHouse"
        />
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
                :hide-house="sameHouse"
              />
              <div
                v-if="model.reduction"
                class="cashier-reduction-info"
              >
                {{ t('CashierDesk.reductionApplied') }} · {{ model.reduction.reason }}
              </div>
            </SectionCard>
            <SectionCard
              icon="ProfileOutlined"
              :title="t('Cashier.paymentInfo')"
            >
              <template
                v-if="companies.length === 1"
                #actions
              >
                <span class="cashier-fixed-company">{{ t('Cashier.company') }}：{{ companies[0].name }}</span>
              </template>
              <div class="cashier-grid">
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
              </div>
            </SectionCard>
            <CashierFunding
              :state="state"
              compact
              single
            />
            <a-collapse
              ghost
              class="cashier-supplement"
            >
              <a-collapse-panel
                key="supplement"
                :header="t('Cashier.supplement')"
              >
                <a-form-item :label="t('Setting.remark')">
                  <a-textarea
                    v-model:value="model.remark"
                    :maxlength="1000"
                    :rows="2"
                    show-count
                  />
                </a-form-item>
                <a-form-item class="cashier-receipt-field">
                  <FileUpload
                    :value="files"
                    :size="20"
                    :max-count="1"
                    drag
                    :multiple="false"
                    :disabled="calculating || saving || loading"
                    @upload-change="filesChanged"
                  >
                    <div class="cashier-receipt-dropzone">
                      <AIcon type="InboxOutlined" />
                      <div>
                        <div class="cashier-receipt-title">{{ t('Cashier.uploadReceipt') }}</div>
                        <div class="cashier-receipt-hint">{{ t('Cashier.attachmentHint') }}</div>
                      </div>
                    </div>
                  </FileUpload>
                </a-form-item>
              </a-collapse-panel>
            </a-collapse>
          </a-form>
        </a-spin>
      </template>
    </div>
    <template #footer>
      <div class="cashier-collection-footer">
        <div
          v-if="!result"
          class="cashier-collection-total"
        >
          <span>{{ t('Cashier.total') }}</span>
          <strong>{{ preview?.total || total }}</strong>
        </div>
        <a-space>
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
        </a-space>
      </div>
    </template>
  </a-modal>
</template>
