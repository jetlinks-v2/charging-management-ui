<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import type { ActivitySummary } from '../../../api/financeActivity'
const props = defineProps<{ row: ActivitySummary; extend: boolean; saving: boolean }>()
const emit = defineEmits<{ save: [date: string]; close: [] }>()
const { t } = useI18n(),
  form = ref<FormInstance>(),
  model = ref({ endDate: '' })
function validate() {
  const value = model.value.endDate,
    row = props.row.activity
  return value &&
    (props.extend
      ? value > row.endDate
      : value < row.endDate && value >= row.startDate && value >= dayjs().format('YYYY-MM-DD'))
    ? Promise.resolve()
    : Promise.reject(t('Activity.adjustDateInvalid'))
}
async function submit() {
  try {
    await form.value?.validate()
  } catch {
    return
  }
  emit('save', model.value.endDate)
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t(extend ? 'Activity.extend' : 'Activity.endEarly')"
    :width="480"
    :confirm-loading="saving"
    :closable="!saving"
    :mask-closable="!saving"
    :cancel-button-props="{ disabled: saving }"
    :ok-text="t('Finance.save')"
    :cancel-text="t('Finance.cancel')"
    @ok="submit"
    @cancel="emit('close')"
  >
    <KvGrid
      :cols="1"
      :items="[
        { label: t('Activity.name'), value: row.activity.name },
        { label: t('Activity.originalEnd'), value: row.activity.endDate }
      ]"
    />
    <a-form
      ref="form"
      :model="model"
      layout="vertical"
      :disabled="saving"
      class="activity-date-form"
    >
      <a-form-item
        name="endDate"
        :label="t('Activity.newEnd')"
        :rules="[{ required: true, validator: validate, trigger: 'change' }]"
      >
        <a-date-picker
          v-model:value="model.endDate"
          value-format="YYYY-MM-DD"
          :placeholder="t('Activity.newEnd')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.activity-date-form {
  margin-top: 24px;
}
.ant-picker {
  width: 100%;
}
</style>
