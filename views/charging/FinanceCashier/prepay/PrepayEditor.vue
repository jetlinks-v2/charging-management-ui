<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePrepay } from '../../../../hooks/finance-prepay/usePrepay'
import { usePrepayRecovery } from '../../../../hooks/finance-prepay/usePrepayRecovery'
import { useProjectSwitchGuard } from '../../../../hooks/project/useProjectContext'
import PaymentSummary from '../PaymentSummary.vue'
import PrepaySelection from './PrepaySelection.vue'
import PrepayPeriods from './PrepayPeriods.vue'
import PrepayPayment from './PrepayPayment.vue'
const props = defineProps<{ projectId: string; spaceId: string; spaceName: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = usePrepay(
  props,
  () => emit('saved'),
  usePrepayRecovery(() => props.projectId)
)
const {
  quote,
  result,
  settings,
  loadFailed,
  loading,
  calculating,
  saving,
  uncertain,
  recoveryFailed,
  uploading,
  invalidFiles,
  companyName
} = state
useProjectSwitchGuard(() => !!result.value)
function close() {
  if (!saving.value && !calculating.value && !uploading.value && !uncertain.value) emit('close')
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="960"
    icon="CalendarOutlined"
    :title="t('Prepay.title')"
    :sub="quote?.houseName || spaceName"
    @update:open="close"
  >
    <div class="cashier-editor">
      <PaymentSummary
        v-if="result"
        :detail="result"
      />
      <template v-else>
        <a-steps
          size="small"
          :current="quote ? 1 : 0"
          :items="[{ title: t('Prepay.selection') }, { title: t('Prepay.confirm') }]"
        />
        <a-alert
          v-if="uncertain"
          type="warning"
          show-icon
          :message="t('Cashier.unknownResult')"
        />
        <template v-if="quote">
          <PrepayPeriods
            :quote="quote"
            :company-name="companyName"
          />
          <PrepayPayment :state="state" />
        </template>
        <a-spin
          v-else
          :spinning="loading"
        >
          <PrepaySelection
            v-if="settings.length"
            :state="state"
          />
          <a-button
            v-else-if="loadFailed"
            @click="state.load"
          >
            {{ t('Finance.retry') }}
          </a-button>
          <CloudEmpty
            v-else-if="!loading"
            :description="t('Prepay.empty')"
          />
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
          v-if="quote"
          :disabled="saving || uncertain || uploading"
          @click="state.invalidate"
        >
          {{ t('Adjustment.back') }}
        </a-button>
        <a-button
          v-if="quote"
          type="primary"
          :loading="saving"
          :disabled="recoveryFailed || (!uncertain && (!state.balanced.value || uploading || invalidFiles))"
          @click="state.submit"
        >
          {{ t(uncertain ? 'Cashier.retry' : 'Cashier.confirm') }}
        </a-button>
        <a-button
          v-else
          type="primary"
          :loading="calculating"
          :disabled="loading || recoveryFailed || !settings.length"
          @click="state.calculate"
        >
          {{ t('Prepay.calculate') }}
        </a-button>
      </template>
    </template>
  </JlDrawerShell>
</template>
