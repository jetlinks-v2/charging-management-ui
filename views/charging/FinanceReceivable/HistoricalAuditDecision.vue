<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useHistoricalAudit } from '../../../hooks/finance-receivable/useHistoricalAudit'
const props = defineProps<{ state: ReturnType<typeof useHistoricalAudit>; collection?: boolean }>()
const { t } = useI18n()
const { decision, reason, busy, submit } = props.state
</script>
<template>
  <a-modal
    :open="true"
    :title="t('HistoricalAudit.' + decision?.action)"
    :width="640"
    :confirm-loading="busy"
    :closable="!busy"
    :keyboard="!busy"
    :mask-closable="false"
    :ok-text="t('HistoricalAudit.submit')"
    :ok-button-props="{ danger: decision?.action === 'reject', disabled: !reason.trim() }"
    :cancel-button-props="{ disabled: busy }"
    @cancel="decision = undefined"
    @ok="submit"
  >
    <a-alert
      type="info"
      show-icon
      :message="t(collection ? 'CollectionImport.approvalHint' : 'HistoricalAudit.hint')"
    />
    <div class="audit-decision-summary">
      <p
        v-for="record in decision?.records"
        :key="record.id"
      >
        {{ record.fileName }}
      </p>
      <strong>
        {{
          decision?.lines
            ? t('HistoricalAudit.selected', { count: decision.lines.length })
            : t('HistoricalAudit.allPending')
        }}
      </strong>
    </div>
    <a-form layout="vertical">
      <a-form-item
        required
        :label="t('HistoricalAudit.reason')"
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy"
          :maxlength="1000"
          :rows="4"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.audit-decision-summary {
  max-height: 180px;
  overflow: auto;
  margin: 20px 0;
  line-height: 1.7;
}
.audit-decision-summary p {
  margin: 0 0 4px;
  overflow-wrap: anywhere;
}
</style>
