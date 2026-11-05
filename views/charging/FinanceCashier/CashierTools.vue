<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{ projectId: string; busy: boolean; leaf: boolean }>()
const emit = defineEmits<{ temporary: []; topup: [type: 'ADVANCE' | 'DEPOSIT']; prepay: [] }>()
const { t } = useI18n()
</script>
<template>
  <a-space wrap>
    <j-permission-button
      hasPermission="charging/FinanceCashier:collect"
      :disabled="!projectId || !leaf || busy"
      @click="emit('prepay')"
    >
      <AIcon type="CalendarOutlined" />
      {{ t('Prepay.title') }}
    </j-permission-button>
    <j-permission-button
      hasPermission="charging/FinanceCashier:temporary"
      :disabled="!projectId || busy"
      @click="emit('temporary')"
    >
      <AIcon type="AccountBookOutlined" />
      {{ t('Temporary.collect') }}
    </j-permission-button>
    <j-permission-button
      hasPermission="charging/FinanceCashier:topup"
      :disabled="!projectId || busy"
      @click="emit('topup', 'ADVANCE')"
    >
      <AIcon type="WalletOutlined" />
      {{ t('Funds.collectAdvance') }}
    </j-permission-button>
    <j-permission-button
      hasPermission="charging/FinanceCashier:topup"
      :disabled="!projectId || busy"
      @click="emit('topup', 'DEPOSIT')"
    >
      <AIcon type="SafetyCertificateOutlined" />
      {{ t('Funds.collectDeposit') }}
    </j-permission-button>
  </a-space>
</template>
