<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance, UploadChangeParam, UploadFile } from 'ant-design-vue'
import { FileUpload } from '@jetlinks-web-core/components'
import { getImageUrl } from '@jetlinks-web-core/utils'
import type { ActivityDetail, ActivityInput, ActivityOptions } from '../../../api/financeActivity'
import ActivityBenefits from './ActivityBenefits.vue'
const props = defineProps<{ detail?: ActivityDetail; options: ActivityOptions; saving: boolean }>()
const emit = defineEmits<{ save: [input: ActivityInput]; cancel: []; busy: [value: boolean] }>()
const { t } = useI18n(),
  form = ref<FormInstance>(),
  files = ref<UploadFile[]>([])
const initial = (): ActivityInput => ({
  name: '',
  activityType: '',
  startDate: '',
  endDate: '',
  subjectId: '',
  standardId: '',
  offsetArrears: false,
  targetIds: [],
  tiers: [{ paidMonths: null, giftMonths: null }],
  attachments: [],
  remark: ''
})
const model = ref<ActivityInput>(initial())
watch(
  () => props.detail,
  (row) => {
    model.value = row
      ? {
          ...row.config.input,
          targetIds: [...row.config.input.targetIds],
          tiers: row.config.input.tiers.map((tier) => ({ ...tier })),
          attachments: row.config.input.attachments.map((file) => ({ ...file }))
        }
      : initial()
    files.value = model.value.attachments.map((file) => ({
      uid: file.fileId,
      name: file.fileName,
      status: 'done',
      url: getImageUrl(file.fileId),
      response: { result: { id: file.fileId } }
    }))
  },
  { immediate: true }
)
const uploading = computed(() => files.value.some((file) => file.status === 'uploading'))
const invalidFiles = computed(() => files.value.some((file) => file.status !== 'done' || !file.response?.result?.id))
watch(uploading, (value) => emit('busy', value))
function withCurrent(choices: { value: string; label: string }[], value: string, label?: string) {
  return value && label && !choices.some((choice) => choice.value === value)
    ? [...choices, { value, label: label + ' · ' + t('Activity.unavailable'), disabled: true }]
    : choices
}
// 停用的历史选项仍显示原名称，编辑时不能让下拉退化为裸编码。
const types = computed(() =>
  withCurrent(
    props.options.types.map((type) => ({ value: type.value, label: type.text })),
    model.value.activityType,
    props.detail?.config.activityTypeName
  )
)
const subjects = computed(() =>
  withCurrent(
    Array.from(
      new Map(
        props.options.standards.map((row) => [row.subjectId, { value: row.subjectId, label: row.subjectName }])
      ).values()
    ),
    model.value.subjectId,
    props.detail?.config.subjectName
  )
)
const standards = computed(() =>
  withCurrent(
    props.options.standards
      .filter((row) => row.subjectId === model.value.subjectId)
      .map((row) => ({ value: row.id, label: row.standardName })),
    model.value.standardId,
    props.detail?.config.standardName
  )
)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Activity.' + key) }) }]
function subjectChanged() {
  model.value.standardId = ''
}
function optionValue(field: 'activityType' | 'subjectId' | 'standardId', value: unknown) {
  model.value[field] = typeof value === 'string' ? value : ''
}
function filesChanged(info: UploadChangeParam) {
  files.value = info.fileList
  // 只保存上传成功的平台文件身份；失败或上传中的文件不能静默从提交中略去。
  model.value.attachments = info.fileList
    .filter((file) => file.status === 'done' && file.response?.result?.id)
    .map((file) => ({ fileId: file.response.result.id, fileName: file.name }))
}
async function submit() {
  if (uploading.value || invalidFiles.value || props.saving) return
  try {
    await form.value?.validate()
  } catch {
    return
  }
  emit('save', {
    ...model.value,
    offsetStartDate: model.value.offsetArrears ? model.value.offsetStartDate : null,
    offsetEndDate: model.value.offsetArrears ? model.value.offsetEndDate : null
  })
}
const periodValidation = () =>
  model.value.startDate && model.value.endDate && model.value.startDate > model.value.endDate
    ? Promise.reject(t('Activity.dateInvalid'))
    : Promise.resolve()
</script>
<template>
  <a-form
    ref="form"
    :model="model"
    layout="vertical"
    :disabled="saving"
    class="activity-sections"
  >
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Activity.basic')"
    >
      <a-form-item
        name="name"
        :label="t('Activity.name')"
        :rules="required('name')"
      >
        <a-input
          v-model:value="model.name"
          :maxlength="100"
          :placeholder="t('Activity.name')"
        />
      </a-form-item>
      <div class="finance-form-grid">
        <a-form-item
          name="activityType"
          :label="t('Activity.type')"
          :rules="required('type')"
        >
          <a-select
            :value="model.activityType || undefined"
            @update:value="(value) => optionValue('activityType', value)"
            :options="types"
            :placeholder="t('Activity.type')"
          />
        </a-form-item>
        <a-form-item
          name="subjectId"
          :label="t('Activity.subject')"
          :rules="required('subject')"
        >
          <a-select
            :value="model.subjectId || undefined"
            @update:value="(value) => optionValue('subjectId', value)"
            :options="subjects"
            :placeholder="t('Activity.subject')"
            @change="subjectChanged"
          />
        </a-form-item>
        <a-form-item
          name="standardId"
          :label="t('Activity.standard')"
          :rules="required('standard')"
        >
          <a-select
            :value="model.standardId || undefined"
            @update:value="(value) => optionValue('standardId', value)"
            :options="standards"
            :placeholder="t('Activity.standard')"
            :disabled="!model.subjectId"
          />
        </a-form-item>
        <span />
        <a-form-item
          name="startDate"
          :label="t('Activity.startDate')"
          :rules="required('startDate')"
        >
          <a-date-picker
            v-model:value="model.startDate"
            value-format="YYYY-MM-DD"
            :placeholder="t('Activity.startDate')"
          />
        </a-form-item>
        <a-form-item
          name="endDate"
          :label="t('Activity.endDate')"
          :rules="[
            ...required('endDate'),
            {
              validator: periodValidation
            }
          ]"
        >
          <a-date-picker
            v-model:value="model.endDate"
            value-format="YYYY-MM-DD"
            :placeholder="t('Activity.endDate')"
          />
        </a-form-item>
      </div>
    </SectionCard>
    <ActivityBenefits
      :model="model"
      :options="options"
      :saving="saving"
    />
    <SectionCard
      icon="PaperClipOutlined"
      :title="t('Activity.attachments')"
    >
      <FileUpload
        :value="files"
        :size="20"
        :max-count="20"
        :disabled="saving"
        :btn-text="t('Adjustment.upload')"
        @upload-change="filesChanged"
      />
      <p
        v-if="invalidFiles && !uploading"
        class="activity-note"
      >
        {{ t('Activity.fileFailed') }}
      </p>
      <a-form-item :label="t('Activity.remark')">
        <a-textarea
          v-model:value="model.remark"
          :maxlength="1000"
          :rows="3"
          show-count
        />
      </a-form-item>
    </SectionCard>
    <StickyActionBar>
      <a-button
        :disabled="saving || uploading"
        @click="emit('cancel')"
      >
        {{ t('Finance.cancel') }}
      </a-button>
      <j-permission-button
        type="primary"
        hasPermission="charging/FinanceActivity:save"
        :loading="saving"
        :disabled="uploading || invalidFiles"
        @click="submit"
      >
        {{ t('Finance.save') }}
      </j-permission-button>
    </StickyActionBar>
  </a-form>
</template>
<style src="../finance.css"></style>
<style scoped src="./activity.css"></style>
