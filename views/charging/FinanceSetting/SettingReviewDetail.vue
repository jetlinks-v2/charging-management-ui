<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useSettingReview } from '../../../hooks/finance-setting/useSettingReview'
import { settingPermission } from '../../../hooks/finance-setting/useSettingWorkspace'
import SettingDetail from './SettingDetail.vue'
const props = defineProps<{ state: ReturnType<typeof useSettingReview> }>()
const { t } = useI18n()
const { detail, loading, failed, busy, decision, start, closeDetail } = props.state
</script>
<template>
  <a-modal
    open
    :title="t('Setting.detail')"
    :width="920"
    :style="{ maxWidth: 'calc(100vw - 40px)', top: '24px' }"
    :mask-closable="false"
    :closable="!busy && !decision"
    :keyboard="!busy && !decision"
    @cancel="closeDetail"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 12 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <SettingDetail
      v-else-if="detail"
      :detail="detail"
    />
    <template #footer>
      <a-space>
        <a-button
          :disabled="busy || !!decision"
          @click="closeDetail"
        >
          {{ t('Finance.close') }}
        </a-button>
        <template v-if="detail?.reviewState === 'PENDING' && !loading && !failed">
          <j-permission-button
            :hasPermission="`${settingPermission}:reject`"
            danger
            :disabled="busy"
            @click="start('reject', [detail])"
          >
            {{ t('HistoricalAudit.reject') }}
          </j-permission-button>
          <j-permission-button
            :hasPermission="`${settingPermission}:approve`"
            type="primary"
            :disabled="busy"
            @click="start('approve', [detail])"
          >
            {{ t('HistoricalAudit.approve') }}
          </j-permission-button>
        </template>
      </a-space>
    </template>
  </a-modal>
</template>
