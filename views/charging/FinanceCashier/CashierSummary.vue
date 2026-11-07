<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
const props = defineProps<{ state: ReturnType<typeof useCashierWorkspace>; busy: boolean }>()
const emit = defineEmits<{ collect: []; prepay: [] }>()
const { t } = useI18n()
const { selected, balances, balanceFailed, total, clear, loading } = props.state
</script>
<template>
  <aside class="cashier-checkout">
    <div class="cashier-checkout-title">
      <AIcon type="WalletOutlined" />
      <strong>{{ t('CashierDesk.checkout') }}</strong>
    </div>
    <div class="cashier-balances">
      <div>
        <span>{{ t('CashierDesk.advanceBalance') }}</span>
        <strong>{{ balanceFailed || !state.archive.selected.value?.customerBound || loading ? '—' : balances.advance }}</strong>
      </div>
      <div>
        <span>{{ t('CashierDesk.depositBalance') }}</span>
        <strong>{{ balanceFailed || !state.archive.selected.value?.customerBound || loading ? '—' : balances.deposit }}</strong>
      </div>
    </div>
    <div class="cashier-summary-lines">
      <div>
        <span>{{ t('CashierDesk.regularFee') }}</span>
        <strong>{{ total }}</strong>
      </div>
      <div>
        <span>{{ t('CashierDesk.selectedBills') }}</span>
        <span>{{ selected.length }}</span>
      </div>
    </div>
    <div class="cashier-checkout-bottom">
      <span>{{ t('CashierDesk.actualDue') }}</span>
      <strong class="cashier-checkout-amount">¥ {{ total || '—' }}</strong>
      <j-permission-button
        type="primary"
        size="large"
        block
        hasPermission="charging/FinanceCashier:collect"
        :disabled="busy || loading || !selected.length || selected.length > 100 || !total || total === '0.00'"
        @click="emit('collect')"
      >
        {{ t('Cashier.collect') }}
      </j-permission-button>
      <j-permission-button
        block
        hasPermission="charging/FinanceCashier:collect"
        :disabled="busy || !state.archive.selected.value?.customerBound"
        @click="emit('prepay')"
      >
        {{ t('Prepay.title') }}
      </j-permission-button>
      <a-button
        v-if="selected.length"
        type="link"
        :disabled="busy"
        @click="clear"
      >
        {{ t('Receivable.clearSelection') }}
      </a-button>
      <p
        v-if="selected.length > 100"
        class="cashier-limit"
      >
        {{ t('CashierDesk.collectLimit') }}
      </p>
    </div>
  </aside>
</template>
