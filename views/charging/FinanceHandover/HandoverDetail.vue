<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { Grid } from 'ant-design-vue'
import { FileUpload } from '@jetlinks-web-core/components'
import { getImageUrl } from '@jetlinks-web-core/utils'
import { queryHandoverLogs } from '../../../api/financeHandover'
import type { Query } from '../../../api/archive'
import type { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
import HandoverLines from './HandoverLines.vue'
const props = defineProps<{ state: ReturnType<typeof useHandoverWorkspace> }>()
const screens = Grid.useBreakpoint()
const { t, projectId, detail, loading, detailFailed, closeDetail, notify } = props.state
const columns = computed(() => [
  { title: t('Handover.operation'), dataIndex: 'action', width: 130, scopedSlots: true },
  { title: t('Handover.state'), dataIndex: 'afterStatus', width: 120, scopedSlots: true },
  { title: t('Handover.reason'), dataIndex: 'reason', width: 240 },
  { title: t('Handover.operator'), dataIndex: 'modifierName', width: 140 },
  { title: t('Handover.operationTime'), dataIndex: 'createTime', width: 180, scopedSlots: true }
])
const request = (q: Query) => queryHandoverLogs(projectId.value, detail.value!.batch.id, q)
const files = computed(() =>
  detail.value?.batch.attachmentFileId
    ? [
        {
          uid: detail.value.batch.attachmentFileId,
          name: detail.value.batch.attachmentName || '',
          status: 'done' as const,
          url: getImageUrl(detail.value.batch.attachmentFileId)
        }
      ]
    : []
)
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="1040"
    :title="t('Handover.detail')"
    icon="AuditOutlined"
    @update:open="closeDetail"
  >
    <a-spin
      :spinning="loading"
      class="handover-spin"
    >
      <div
        v-if="detail"
        class="handover-content"
      >
        <SectionCard
          icon="ProfileOutlined"
          :title="t('Handover.summary')"
        >
          <a-space class="handover-status">
            <a-tag
              :color="
                detail.batch.status === 'APPROVED'
                  ? 'success'
                  : detail.batch.status === 'PENDING'
                    ? 'processing'
                    : 'default'
              "
            >
              {{ t('Handover.status.' + detail.batch.status) }}
            </a-tag>
            <span>{{ detail.batch.closingDate }}</span>
            <a-tag v-if="detail.batch.monthClosed">{{ t('Handover.monthClosed') }}</a-tag>
          </a-space>
          <a-descriptions
            :column="screens.md ? 2 : 1"
            size="small"
          >
            <a-descriptions-item :label="t('Handover.amount')">￥{{ detail.batch.amount }}</a-descriptions-item>
            <a-descriptions-item :label="t('Handover.cash')">￥{{ detail.batch.cashAmount }}</a-descriptions-item>
            <a-descriptions-item :label="t('Handover.submitter')">{{ detail.batch.submittedBy }}</a-descriptions-item>
            <a-descriptions-item :label="t('Handover.submittedAt')">
              {{ detail.batch.submittedAt.replace('T', ' ') }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('Handover.reviewer')">
              {{ detail.batch.reviewedBy || '—' }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('Handover.reviewedAt')">
              {{ detail.batch.reviewedAt?.replace('T', ' ') || '—' }}
            </a-descriptions-item>
            <a-descriptions-item
              :label="t('Handover.remark')"
              :span="screens.md ? 2 : 1"
            >
              {{ detail.batch.remark || '—' }}
            </a-descriptions-item>
            <a-descriptions-item
              :label="t('Handover.reviewRemark')"
              :span="screens.md ? 2 : 1"
            >
              {{ detail.batch.reviewRemark || '—' }}
            </a-descriptions-item>
          </a-descriptions>
          <FileUpload
            v-if="files.length"
            :value="files"
            disabled
            :show-upload-list="{ showRemoveIcon: false }"
          />
        </SectionCard>
        <SectionCard
          icon="UnorderedListOutlined"
          :title="t('Handover.lines')"
        >
          <HandoverLines :lines="detail.lines" />
        </SectionCard>
        <SectionCard
          icon="HistoryOutlined"
          :title="t('Handover.logs')"
        >
          <j-pro-table
            :key="detail.batch.id"
            row-key="id"
            type="PAGE"
            mode="TABLE"
            :columns="columns"
            :request="request"
            :params="{ id: detail.batch.id }"
            :no-pagination="false"
            :pagination="{ pageSize: 10 }"
            :alert-show="false"
            :body-style="{ padding: 0 }"
            :scroll="{ x: 810 }"
            @request-error="notify"
          >
            <template #action="row">{{ t('Handover.action.' + row.action) }}</template>
            <template #afterStatus="row">
              <a-tag>{{ t('Handover.status.' + row.afterStatus) }}</a-tag>
            </template>
            <template #createTime="row">{{ dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}</template>
            <template #emptyText><CloudEmpty :description="t('Handover.noLogs')" /></template>
          </j-pro-table>
        </SectionCard>
      </div>
      <CloudEmpty
        v-else-if="!loading"
        :description="t(detailFailed ? 'Finance.failed' : 'Handover.noRecords')"
      />
    </a-spin>
    <template #foot>
      <a-button @click="closeDetail">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
