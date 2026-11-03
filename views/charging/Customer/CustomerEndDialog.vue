<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'
import type { FormInstance } from 'ant-design-vue'
import type { useCustomerDetail } from '../../../hooks/archive/useCustomerDetail'

const props = defineProps<{ state: ReturnType<typeof useCustomerDetail> }>()
const { t } = useI18n()
const k = 'Archive.'
const form = ref<FormInstance>()
const relation = computed(() => props.state.ending.value)
const model = computed(() => ({ endTime: props.state.endTime.value, endReason: props.state.endReason.value }))
const timeValue = computed(() => (model.value.endTime ? dayjs(model.value.endTime) : undefined))
const changeTime = (value: string | Dayjs | null) => {
  props.state.endTime.value = value ? dayjs(value).valueOf() : 0
}
const timeRules = computed(() => [
  { required: true, message: t(k + 'endTimeRequired') },
  {
    validator: async (_rule: unknown, value?: number) => {
      if (!value) throw new Error(t(k + 'endTimeRequired'))
      if (value && relation.value && value < relation.value.startTime) throw new Error(t(k + 'endTimeBeforeStart'))
    }
  }
])
const cancel = () => {
  if (!props.state.busy.value) props.state.ending.value = undefined
}
const submit = async () => {
  // 校验留在输入项下；请求失败保留弹窗和已填内容，供用户修改或重试。
  try {
    await form.value?.validate()
  } catch {
    return
  }
  await props.state.end()
}
</script>
<template>
  <a-modal
    :open="!!relation"
    :title="t(k + 'endRelation')"
    :width="520"
    centered
    destroy-on-close
    :mask-closable="false"
    :closable="!state.busy.value"
    :keyboard="!state.busy.value"
    @cancel="cancel"
  >
    <a-space
      direction="vertical"
      size="middle"
      style="width: 100%"
    >
      <div>
        <a-typography-text strong>{{ state.customer.value?.name }}</a-typography-text>
        <div>{{ relation?.spaceLocation || relation?.fullName || relation?.spaceName }}</div>
        <a-typography-text type="secondary">{{ t(k + 'endRelationHint') }}</a-typography-text>
      </div>
      <a-form
        ref="form"
        :model="model"
        layout="vertical"
        :disabled="state.busy.value"
      >
        <a-form-item
          name="endTime"
          :label="t(k + 'endTime')"
          :rules="timeRules"
        >
          <a-date-picker
            :value="timeValue"
            show-time
            style="width: 100%"
            @change="changeTime"
          />
        </a-form-item>
        <a-form-item
          name="endReason"
          :label="t(k + 'endReason')"
          :rules="[{ required: true, whitespace: true, message: t(k + 'endReasonRequired') }]"
        >
          <a-textarea
            v-model:value="state.endReason.value"
            :maxlength="500"
            :rows="3"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-space>
    <template #footer>
      <a-button
        :disabled="state.busy.value"
        @click="cancel"
      >
        {{ t(k + 'cancel') }}
      </a-button>
      <j-permission-button
        hasPermission="charging/Customer:save"
        type="primary"
        :loading="state.busy.value"
        @click="submit"
      >
        {{ t(k + 'confirmEnd') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
