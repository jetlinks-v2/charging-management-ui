<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Receivable, ReceivableAction } from '../../../api/financeReceivable'
import { receivablePermission } from '../../../hooks/finance-receivable/useReceivableWorkspace'
defineProps<{ row: Receivable; readonly?: boolean }>()
const emit = defineEmits<{
  select: [mode?: true | 'SPLIT' | 'LOG']
  action: [action: ReceivableAction]
}>()
const { t } = useI18n()
const actions = (row: Receivable) =>
  (['FREEZE', 'UNFREEZE'] as ReceivableAction[]).filter((action) => row.allowedOperations.includes(action))
</script>
<template>
  <a-button
    v-if="readonly"
    type="link"
    size="small"
    @click="emit('select')"
  >
    {{ t('Finance.detail') }}
  </a-button>
  <a-dropdown
    v-else
    :trigger="['click']"
  >
    <a-button
      type="link"
      size="small"
    >
      {{ t('ReceivableLedger.actions') }}
      <AIcon type="DownOutlined" />
    </a-button>
    <template #overlay>
      <a-menu>
        <a-menu-item key="detail">
          <a-button
            type="text"
            @click="emit('select')"
          >
            {{ t('Finance.detail') }}
          </a-button>
        </a-menu-item>
        <a-menu-item key="logs">
          <a-button
            type="text"
            @click="emit('select', 'LOG')"
          >
            {{ t('Receivable.logs') }}
          </a-button>
        </a-menu-item>
        <a-menu-item
          v-if="row.allowedOperations.includes('ADJUST')"
          key="adjust"
        >
          <j-permission-button
            type="text"
            :hasPermission="`${receivablePermission}:adjust`"
            @click="emit('select', true)"
          >
            {{ t('Adjustment.title') }}
          </j-permission-button>
        </a-menu-item>
        <a-menu-item
          v-if="row.allowedOperations.includes('SPLIT')"
          key="split"
        >
          <j-permission-button
            type="text"
            :hasPermission="`${receivablePermission}:split`"
            @click="emit('select', 'SPLIT')"
          >
            {{ t('Split.title') }}
          </j-permission-button>
        </a-menu-item>
        <a-menu-item
          v-for="action in actions(row)"
          :key="action"
        >
          <j-permission-button
            type="text"
            :hasPermission="`${receivablePermission}:freeze`"
            @click="emit('action', action)"
          >
            {{ t('Receivable.operation.' + action) }}
          </j-permission-button>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
