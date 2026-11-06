<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getClosingRule, saveClosingRule, type ClosingRule } from '../../../api/financeAccounting'
import { requestErrorMessage } from '../../../utils/requestError'
import AutomaticClosing from './AutomaticClosing.vue'
import AutomaticClosingRuns from './AutomaticClosingRuns.vue'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const tab = ref('review'),
  automaticBusy = ref(false)
const loading = ref(false),
  saving = ref(false),
  rule = ref<ClosingRule>(),
  requireReview = ref(false),
  reason = ref('')
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
async function load() {
  loading.value = true
  rule.value = undefined
  try {
    rule.value = await getClosingRule(props.projectId)
    requireReview.value = rule.value.requireReceivableReview
  } catch (e) {
    notify(e)
  } finally {
    loading.value = false
  }
}
async function save() {
  if (!rule.value || saving.value || !reason.value.trim()) return
  saving.value = true
  try {
    rule.value = await saveClosingRule(props.projectId, {
      ...rule.value,
      requireReceivableReview: requireReview.value,
      reason: reason.value.trim()
    })
    onlyMessage(t('MonthClosing.ruleSaved'), 'success')
    emit('saved')
    emit('close')
  } catch (e) {
    notify(e)
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <a-modal
    :open="true"
    :width="760"
    :mask-closable="false"
    :closable="!saving && !automaticBusy"
    :keyboard="!saving && !automaticBusy"
    :footer="null"
    :title="t('MonthClosing.ruleTitle')"
    class="closing-rule"
    @cancel="emit('close')"
  >
    <p>{{ t('MonthClosing.ruleHint') }}</p>
    <a-tabs
      v-model:active-key="tab"
      :destroy-inactive-tab-pane="true"
    >
      <a-tab-pane
        key="review"
        :tab="t('MonthClosing.reviewRule')"
        :disabled="automaticBusy"
      >
        <a-spin :spinning="loading">
          <a-form
            v-if="rule"
            layout="vertical"
            class="closing-rule-form"
          >
            <a-form-item :label="t('MonthClosing.requireReview')">
              <a-switch
                v-model:checked="requireReview"
                :disabled="saving"
              />
            </a-form-item>
            <a-form-item
              required
              :label="t('MonthClosing.reason')"
            >
              <a-textarea
                v-model:value="reason"
                :disabled="saving"
                :rows="2"
                :maxlength="1000"
                show-count
              />
            </a-form-item>
          </a-form>
          <CloudEmpty
            v-else-if="!loading"
            :description="t('MonthClosing.ruleFailed')"
          >
            <a-button @click="load">{{ t('Finance.refresh') }}</a-button>
          </CloudEmpty>
        </a-spin>
        <div class="closing-rule-actions">
          <j-permission-button
            type="primary"
            hasPermission="charging/FinanceMonthClosing:save"
            :loading="saving"
            :disabled="!rule || !reason.trim()"
            @click="save"
          >
            {{ t('Finance.save') }}
          </j-permission-button>
        </div>
      </a-tab-pane>
      <a-tab-pane
        key="automatic"
        :tab="t('MonthClosing.auto.title')"
        :disabled="saving"
      >
        <AutomaticClosing
          :project-id="projectId"
          @busy="automaticBusy = $event"
        />
      </a-tab-pane>
      <a-tab-pane
        key="runs"
        :tab="t('MonthClosing.auto.runs')"
        :disabled="saving || automaticBusy"
      >
        <AutomaticClosingRuns :project-id="projectId" />
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>
<style scoped>
.closing-rule-form {
  max-width: 640px;
}
.closing-rule-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
