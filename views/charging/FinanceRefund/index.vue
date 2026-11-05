<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FinancePage from '../components/FinancePage.vue'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import RefundApplications from './RefundApplications.vue'
import RefundHistory from './RefundHistory.vue'
const { t } = useI18n()
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <section class="refund-workspace">
      <a-tabs
        default-active-key="applications"
        destroy-inactive-tab-pane
      >
        <a-tab-pane
          key="applications"
          :tab="t('Refund.application')"
        >
          <RefundApplications />
        </a-tab-pane>
        <a-tab-pane
          key="history"
          :tab="t('Refund.history')"
        >
          <RefundHistory />
        </a-tab-pane>
      </a-tabs>
    </section>
  </FinancePage>
</template>
<style scoped>
.refund-workspace {
  margin-top: 16px;
  padding: 8px 20px 20px;
  background: var(--panel-background, #fff);
  border-radius: 8px;
  min-height: 0;
}
</style>
