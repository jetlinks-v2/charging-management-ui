<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import type { Receivable, ReceivableAction } from '../../../api/financeReceivable'
defineProps<{ target: { row: Receivable; action: ReceivableAction }; saving: boolean }>()
const emit = defineEmits<{ close: []; save: [string] }>()
const { t } = useI18n()
const form = ref<FormInstance>(),
  model = reactive({ reason: '' })
async function submit() {
  try {
    await form.value?.validate()
    emit('save', model.reason.trim())
  } catch {
    /* 字段校验就近显示。 */
  }
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Receivable.operation.' + target.action)"
    :confirm-loading="saving"
    :closable="!saving"
    :mask-closable="!saving"
    :keyboard="!saving"
    :cancel-button-props="{ disabled: saving }"
    :ok-text="t('Receivable.confirmAction')"
    :cancel-text="t('Finance.cancel')"
    :ok-button-props="{ danger: target.action === 'DELETE' }"
    @cancel="emit('close')"
    @ok="submit"
  >
    <div class="receivable-target">
      <strong>{{ target.row.fullName }}</strong>
      <p>{{ target.row.subjectName }} · {{ target.row.customerName }}</p>
      <span>{{ target.row.calcStartDate }} ～ {{ target.row.calcEndDate }}</span>
    </div>
    <p class="receivable-explanation">{{ t('Receivable.confirm.' + target.action) }}</p>
    <a-form
      ref="form"
      layout="vertical"
      :model="model"
      :disabled="saving"
    >
      <a-form-item
        name="reason"
        :label="t('Receivable.reason')"
        :rules="[{ required: true, whitespace: true, message: t('Receivable.reasonRequired') }]"
      >
        <a-textarea
          v-model:value="model.reason"
          :rows="3"
          :maxlength="500"
          show-count
          :placeholder="t('Receivable.reasonRequired')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.receivable-target {
  padding: 12px 0 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  overflow-wrap: anywhere;
}
.receivable-target p {
  margin: 8px 0;
}
.receivable-target span,
.receivable-explanation {
  color: var(--ant-color-text-secondary, #595959);
}
.receivable-explanation {
  margin: 16px 0 20px;
  line-height: 1.7;
}
</style>
