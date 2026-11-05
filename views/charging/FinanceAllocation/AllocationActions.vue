<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AllocationBook } from '../../../api/financeAllocation'
defineProps<{ row: AllocationBook; busy: boolean }>()
const emit = defineEmits<{ detail: []; pool: []; edit: []; delete: [] }>()
const { t } = useI18n()
</script>
<template>
  <a-space :size="0">
    <a-button
      type="link"
      :disabled="busy"
      @click="emit('detail')"
    >
      {{ t('Finance.detail') }}
    </a-button>
    <a-button
      type="link"
      :disabled="busy"
      @click="emit('pool')"
    >
      {{ t('Allocation.pool') }}
    </a-button>
    <a-dropdown>
      <a-button
        type="link"
        :disabled="busy"
      >
        {{ t('Carry.more') }}
        <AIcon type="DownOutlined" />
      </a-button>
      <template #overlay>
        <a-menu>
          <a-menu-item>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceAllocation:save"
              :disabled="busy || row.usedCount > 0"
              @click="emit('edit')"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
          </a-menu-item>
          <a-menu-item>
            <a-popconfirm
              :title="t('Allocation.deleteConfirm')"
              :ok-text="t('Finance.delete')"
              :cancel-text="t('Finance.cancel')"
              @confirm="emit('delete')"
            >
              <j-permission-button
                type="link"
                danger
                hasPermission="charging/FinanceAllocation:delete"
                :disabled="busy || row.usedCount > 0"
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </a-space>
</template>
