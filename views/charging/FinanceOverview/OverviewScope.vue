<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProjectPicker from '../components/ProjectPicker.vue'
import type { useOverviewProjects } from '../../../hooks/finance-overview/useOverviewProjects'
defineProps<{ state: ReturnType<typeof useOverviewProjects> }>()
const { t } = useI18n()
</script>
<template>
  <div class="overview-scope">
    <span>{{ t('Overview.projects') }}</span>
    <a-button
      :loading="state.context.loading.value"
      @click="state.choose"
    >
      <AIcon type="EnvironmentOutlined" />
      {{
        state.ids.value.length
          ? t('Overview.selectedProjects', { count: state.ids.value.length })
          : t('ProjectContext.choose')
      }}
      <AIcon type="DownOutlined" />
    </a-button>
    <j-ellipsis
      v-if="state.label.value"
      class="overview-project-names"
    >
      {{ state.label.value }}
    </j-ellipsis>
  </div>
  <ProjectPicker
    :open="state.open.value"
    :projects="state.context.projects.value"
    :current-id="state.context.projectId.value"
    :selected-ids="state.ids.value"
    multiple
    :required="state.required.value"
    :loading="state.context.loading.value"
    :failed="state.context.failed.value"
    :switching="false"
    @close="state.close"
    @confirm="state.confirm"
    @refresh="state.refresh"
  />
</template>
