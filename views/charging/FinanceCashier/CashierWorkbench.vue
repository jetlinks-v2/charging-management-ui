<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
import CashierBillTree from './CashierBillTree.vue'
import CashierRecords from './CashierRecords.vue'
const props = defineProps<{ state: ReturnType<typeof useCashierWorkspace>; busy: boolean }>()
const { t } = useI18n()
const { archive, tab, house, customer, search, scopeLabel } = props.state
</script>
<template>
  <main class="cashier-center">
    <a-tabs
      v-model:active-key="tab"
      class="cashier-tabs"
    >
      <a-tab-pane
        key="collect"
        :tab="t('CashierDesk.collectTab')"
        :disabled="busy"
      />
      <a-tab-pane
        key="records"
        :tab="t('CashierDesk.recordsTab')"
        :disabled="busy"
      />
      <template #rightExtra><slot name="tools" /></template>
    </a-tabs>
    <div class="cashier-locate">
      <a-input-search
        v-model:value="house"
        allow-clear
        :disabled="busy || !archive.projectId.value"
        :placeholder="t('CashierDesk.chooseHouse')"
        @search="search"
      />
      <a-input-search
        v-model:value="customer"
        allow-clear
        :disabled="busy || !archive.projectId.value"
        :placeholder="t('CashierDesk.findCustomer')"
        @search="search"
      />
    </div>
    <div
      v-if="scopeLabel"
      class="cashier-current-scope"
    >
      <AIcon type="EnvironmentOutlined" />
      <span>{{ scopeLabel }}</span>
    </div>
    <div class="cashier-fee-content">
      <CashierBillTree
        v-if="tab === 'collect'"
        :state="state"
        :busy="busy"
      />
      <CashierRecords
        v-else
        :state="state"
      />
    </div>
  </main>
</template>
