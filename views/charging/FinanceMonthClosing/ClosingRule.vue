<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getClosingRule, saveClosingRule, type ClosingRule } from '../../../api/financeAccounting'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
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
  <SectionCard
    icon="SettingOutlined"
    :title="t('MonthClosing.ruleTitle')"
    :sub="t('MonthClosing.ruleHint')"
    class="closing-rule"
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
    <template #actions>
      <a-button
        type="text"
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t('Finance.close') }}
      </a-button>
    </template>
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
  </SectionCard>
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
