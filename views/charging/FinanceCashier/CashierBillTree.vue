<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
const props = defineProps<{ state: ReturnType<typeof useCashierWorkspace>; busy: boolean }>()
const { t } = useI18n()
const { billTree, checked, check, select, freeze, loading, failed, hasScope } = props.state
const expanded = ref<string[]>([])
watch(
  billTree,
  () => {
    const collect = (nodes: typeof billTree.value): string[] =>
      nodes.flatMap((node) => (node.children ? [node.key, ...collect(node.children)] : []))
    expanded.value = collect(billTree.value)
  },
  { immediate: true }
)
</script>
<template>
  <a-spin
    :spinning="loading"
    class="cashier-bill-spin"
  >
    <template v-if="billTree.length">
      <div class="cashier-bill-columns">
        <span>{{ t('CashierDesk.feeDetail') }}</span>
        <span>{{ t('Receivable.actualReceivableAmount') }}</span>
        <span>{{ t('CashierDesk.principal') }}</span>
        <span>{{ t('Finance.actions') }}</span>
      </div>
      <a-tree
        class="cashier-bill-tree"
        checkable
        block-node
        :tree-data="billTree"
        :checked-keys="checked"
        :expanded-keys="expanded"
        @expand="(keys) => (expanded = keys.map(String))"
        :selectable="false"
        :disabled="busy || loading"
        @check="check"
      >
        <template #title="node">
          <div
            class="cashier-bill-row"
            :class="{ 'cashier-bill-period': !!node.row }"
          >
            <span
              class="cashier-bill-name"
              :title="node.title"
            >
              {{ node.title }}
              <a-tag
                v-if="node.row?.frozen"
                color="default"
              >
                {{ t('CashierDesk.frozen') }}
              </a-tag>
            </span>
            <span class="cashier-number">{{ node.amount }}</span>
            <span class="cashier-number">{{ node.arrears }}</span>
            <a-space
              size="small"
              class="cashier-bill-actions"
            >
              <a-button
                v-if="node.row"
                type="link"
                size="small"
                :disabled="busy"
                @click.stop="select(node.row)"
              >
                {{ t('Finance.detail') }}
              </a-button>
              <a-popconfirm
                v-if="node.row?.allowedOperations?.includes('FREEZE')"
                :title="t('CashierDesk.freezeConfirm')"
                @confirm="freeze(node.row)"
              >
                <j-permission-button
                  type="link"
                  size="small"
                  hasPermission="charging/FinanceReceivable:freeze"
                  :disabled="busy"
                  @click.stop
                >
                  {{ t('CashierDesk.freeze') }}
                </j-permission-button>
              </a-popconfirm>
            </a-space>
          </div>
        </template>
      </a-tree>
    </template>
    <CloudEmpty
      v-else-if="!loading"
      :description="t(failed ? 'Finance.failed' : hasScope ? 'CashierDesk.noBills' : 'CashierDesk.chooseScope')"
    />
  </a-spin>
</template>
