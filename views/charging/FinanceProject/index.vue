<script setup lang="ts">
import { computed, watch, onScopeDispose } from 'vue'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import { useI18n } from 'vue-i18n'
import type { TableColumnsType } from 'ant-design-vue'
import { getProjectCompany, createProjectCompany, type ProjectCompany } from '../../../api/finance'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import { useProjectCompanies, projectCompanyPermission } from '../../../hooks/finance/useProjectCompanies'
import { useCompanyCatalog } from '../../../hooks/finance/useCompanyCatalog'
import CompanyDrawer from '../FinanceCompany/CompanyDrawer.vue'
import CompanyPicker from './CompanyPicker.vue'
const { t } = useI18n()
const { projectId, rows, loading, failed, busy, picker, reload, bind, setDefault, unbind } = useProjectCompanies()
const {
  open,
  detail,
  loading: detailLoading,
  failed: detailFailed,
  saving,
  readOnly,
  select,
  close,
  retry,
  save: saveCompany
} = useCompanyCatalog(
  (id) => getProjectCompany(projectId.value, id),
  async (_id, input) => {
    const result = await createProjectCompany(projectId.value, input)
    await reload()
    return { company: result.company, banks: input.banks }
  }
)
watch(projectId, close)
const { guard } = useProjectContext()
const releaseGuard = guard(() => !open.value || readOnly.value)
onScopeDispose(releaseGuard)
const columns = computed<TableColumnsType<ProjectCompany>>(() => [
  { title: t('Finance.companyName'), dataIndex: ['company', 'companyName'], width: 280 },
  { title: t('Finance.taxNumber'), dataIndex: ['company', 'taxNumber'], width: 220 },
  { title: t('Finance.phone'), dataIndex: ['company', 'phone'], width: 150 },
  { title: t('Finance.default'), key: 'default', width: 100 },
  { title: t('Finance.actions'), key: 'actions', width: 240, fixed: 'right' }
])
</script>
<template>
  <j-page-container>
    <ProjectScopeBar>
      <a-button
        :disabled="!projectId || busy"
        :loading="loading"
        @click="reload"
      >
        <AIcon type="ReloadOutlined" />
        {{ t('Finance.refresh') }}
      </a-button>
      <j-permission-button
        :hasPermission="'charging/FinanceCompany:save'"
        :disabled="!projectId || busy"
        @click="select(undefined, false)"
      >
        {{ t('Finance.createAndBind') }}
      </j-permission-button>
      <j-permission-button
        :hasPermission="`${projectCompanyPermission}:save`"
        type="primary"
        :disabled="!projectId || busy"
        @click="picker = true"
      >
        <AIcon type="LinkOutlined" />
        {{ t('Finance.bind') }}
      </j-permission-button>
    </ProjectScopeBar>
    <div class="finance-workspace finance-project-content">
      <CloudEmpty
        v-if="!projectId"
        :description="t('Finance.projectEmpty')"
      />
      <template v-else>
        <div class="finance-section-title">
          <h3>{{ t('Finance.bound') }}</h3>
          <a-tooltip :title="t('Finance.defaultHelp')"><AIcon type="QuestionCircleOutlined" /></a-tooltip>
        </div>
        <a-table
          :row-key="(row: ProjectCompany) => row.relation.id"
          :data-source="rows"
          :columns="columns"
          :loading="loading"
          :scroll="{ x: 1090 }"
          :pagination="{ pageSize: 12, hideOnSinglePage: false, showSizeChanger: true }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'default'">
              <a-tag
                v-if="record.relation.defaultKey"
                color="blue"
              >
                {{ t('Finance.default') }}
              </a-tag>
              <span v-else>—</span>
            </template>
            <template v-if="column.key === 'actions'">
              <a-space :size="0">
                <a-button
                  type="link"
                  size="small"
                  @click="select((record as ProjectCompany).relation.id)"
                >
                  {{ t('Finance.detail') }}
                </a-button>
                <j-permission-button
                  v-if="!record.relation.defaultKey"
                  :hasPermission="`${projectCompanyPermission}:save`"
                  type="link"
                  size="small"
                  :disabled="busy"
                  @click="setDefault(record as ProjectCompany)"
                >
                  {{ t('Finance.setDefault') }}
                </j-permission-button>
                <a-popconfirm
                  v-if="!record.relation.defaultKey"
                  :title="t('Finance.unbindConfirm', { name: record.company.companyName })"
                  @confirm="unbind(record as ProjectCompany)"
                >
                  <j-permission-button
                    :hasPermission="`${projectCompanyPermission}:save`"
                    type="link"
                    danger
                    size="small"
                    :disabled="busy"
                  >
                    {{ t('Finance.unbind') }}
                  </j-permission-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
          <template #emptyText>
            <CloudEmpty :description="t(failed ? 'Finance.failed' : 'Finance.noProjectCompanies')" />
          </template>
        </a-table>
      </template>
    </div>
    <CompanyPicker
      :open="picker"
      :context="{ busy, boundIds: rows.map((row) => row.company.id), projectId }"
      @close="picker = false"
      @confirm="bind"
    />
    <CompanyDrawer
      :open="open"
      :detail="detail"
      :state="{ loading: detailLoading, failed: detailFailed, saving, readOnly }"
      @close="close"
      @retry="retry"
      @save="saveCompany"
    />
  </j-page-container>
</template>
<style src="../finance.css"></style>
