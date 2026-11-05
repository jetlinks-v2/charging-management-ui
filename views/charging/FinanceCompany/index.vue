<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FinanceProject from '../FinanceProject/index.vue'
import FinanceRecorded from '../FinanceRecorded/index.vue'
const { t } = useI18n()
const activeTab = ref('company')
</script>
<template>
  <j-page-container>
    <div class="tax-settings">
      <a-tabs
        v-model:active-key="activeTab"
        class="tax-settings-tabs"
      >
        <a-tab-pane
          key="company"
          :tab="t('Finance.companySettings')"
        >
          <FinanceProject />
        </a-tab-pane>
        <a-tab-pane
          key="recorded"
          :tab="t('Recorded.title')"
        >
          <FinanceRecorded />
        </a-tab-pane>
      </a-tabs>
    </div>
  </j-page-container>
</template>
<style scoped>
.tax-settings {
  min-width: 0;
}
.tax-settings-tabs :deep(> .ant-tabs-nav) {
  margin: 0 0 20px;
}
</style>
