<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useActivityReview } from '../../../hooks/finance-activity/useActivityReview'
import ActivityDetail from './ActivityDetail.vue'
const props = defineProps<{ state: ReturnType<typeof useActivityReview> }>()
const { t } = useI18n()
const { detail, loading, failed, busy } = props.state
const current = computed(() =>
  detail.value
    ? {
        activity: detail.value.activity,
        runtimeStatus: detail.value.runtimeStatus,
        activityTypeName: detail.value.config.activityTypeName,
        subjectName: detail.value.config.subjectName,
        standardName: detail.value.config.standardName
      }
    : undefined
)
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Activity.detail')"
    :width="920"
    :style="{ maxWidth: 'calc(100vw - 48px)', top: '24px' }"
    :mask-closable="false"
    :closable="!busy"
    :keyboard="!busy"
    @cancel="state.closeDetail"
  >
    <div class="activity-review-detail">
      <a-skeleton
        v-if="loading"
        active
        :paragraph="{ rows: 10 }"
      />
      <CloudEmpty
        v-else-if="failed"
        :description="t('Finance.detailFailed')"
      />
      <ActivityDetail
        v-else-if="detail"
        :detail="detail"
      />
    </div>
    <template #footer>
      <a-button
        :disabled="busy"
        @click="state.closeDetail"
      >
        {{ t('Finance.close') }}
      </a-button>
      <template v-if="detail?.activity.reviewState === 'PENDING' && !loading && !failed">
        <j-permission-button
          hasPermission="charging/FinanceActivity:reject"
          danger
          :disabled="busy"
          @click="current && state.start('reject', [current])"
        >
          {{ t('HistoricalAudit.reject') }}
        </j-permission-button>
        <j-permission-button
          hasPermission="charging/FinanceActivity:approve"
          type="primary"
          :disabled="busy"
          @click="current && state.start('approve', [current])"
        >
          {{ t('HistoricalAudit.approve') }}
        </j-permission-button>
      </template>
    </template>
  </a-modal>
</template>
<style scoped>
.activity-review-detail {
  max-height: calc(100dvh - 220px);
  overflow: auto;
  padding: 0 4px 4px;
}
</style>
