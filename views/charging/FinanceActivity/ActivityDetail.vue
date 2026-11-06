<script setup lang="ts">
import { computed } from 'vue'
import { formatFinanceTime } from '../../../utils/financeTime'
import { useI18n } from 'vue-i18n'
import { FileUpload } from '@jetlinks-web-core/components'
import { getImageUrl } from '@jetlinks-web-core/utils'
import type { ActivityDetail } from '../../../api/financeActivity'
const props = defineProps<{ detail: ActivityDetail }>()
const { t } = useI18n()
const basic = computed(() => {
  const c = props.detail.config,
    a = props.detail.activity
  return [
    { label: t('Activity.name'), value: a.name },
    { label: t('Activity.type'), value: c.activityTypeName },
    { label: t('Activity.subject'), value: c.subjectName },
    { label: t('Activity.standard'), value: c.standardName },
    { label: t('Activity.startDate'), value: a.startDate },
    { label: t('Activity.endDate'), value: a.endDate },
    { label: t('Activity.state'), value: t(a.enabled ? 'Activity.enabled' : 'Activity.disabled') },
    { label: t('Activity.progress'), value: t('Activity.' + props.detail.runtimeStatus) }
  ]
})
const files = computed(() =>
  props.detail.config.input.attachments.map((file) => ({
    uid: file.fileId,
    name: file.fileName,
    status: 'done' as const,
    url: getImageUrl(file.fileId)
  }))
)
const columns = computed(() => [
  { title: t('Activity.paidMonths'), dataIndex: 'paidMonths' },
  { title: t('Activity.giftMonths'), dataIndex: 'giftMonths' }
])
</script>
<template>
  <div class="activity-sections">
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Activity.basic')"
    >
      <KvGrid
        :cols="2"
        :items="basic"
      />
    </SectionCard>
    <SectionCard
      icon="AuditOutlined"
      :title="t('Activity.reviewState')"
    >
      <KvGrid
        :cols="2"
        :items="[
          { label: t('Activity.reviewState'), value: t('SettingReview.states.' + detail.activity.reviewState) },
          { label: t('Activity.reviewer'), value: detail.activity.reviewedName || '—' },
          {
            label: t('Activity.reviewTime'),
            value: detail.activity.reviewedAt ? formatFinanceTime(detail.activity.reviewedAt) : '—'
          },
          { label: t('HistoricalAudit.reason'), value: detail.activity.reviewReason || '—' }
        ]"
      />
    </SectionCard>
    <SectionCard
      icon="EnvironmentOutlined"
      :title="t('Activity.targets')"
    >
      <ul class="activity-targets">
        <li
          v-for="target in detail.config.targets"
          :key="target.id"
        >
          {{ target.fullName }}
          <a-tag v-if="target.spaceTypeName">{{ target.spaceTypeName }}</a-tag>
        </li>
      </ul>
    </SectionCard>
    <SectionCard
      icon="GiftOutlined"
      :title="t('Activity.tiers')"
    >
      <a-table
        :columns="columns"
        :data-source="detail.config.input.tiers"
        :pagination="false"
        size="small"
      />
    </SectionCard>
    <SectionCard
      icon="SwapOutlined"
      :title="t('Activity.offset')"
    >
      <KvGrid
        :cols="2"
        :items="[
          {
            label: t('Activity.offsetArrears'),
            value: t(detail.config.input.offsetArrears ? 'Carry.yes' : 'Carry.no')
          },
          {
            label: t('Activity.offsetPeriod'),
            value: detail.config.input.offsetArrears
              ? detail.config.input.offsetStartDate + ' ~ ' + detail.config.input.offsetEndDate
              : '—'
          }
        ]"
      />
    </SectionCard>
    <SectionCard
      v-if="files.length || detail.config.input.remark"
      icon="PaperClipOutlined"
      :title="t('Activity.attachments')"
    >
      <FileUpload
        v-if="files.length"
        :value="files"
        disabled
      >
        <span />
      </FileUpload>
      <p class="activity-remark">{{ detail.config.input.remark || '—' }}</p>
    </SectionCard>
  </div>
</template>
<style scoped src="./activity.css"></style>
