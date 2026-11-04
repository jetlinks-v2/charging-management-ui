<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ActivitySummary } from '../../../api/financeActivity'
defineProps<{ row: ActivitySummary; busy: boolean }>()
const emit = defineEmits<{ detail: []; edit: []; history: []; state: []; delete: []; date: [extend: boolean] }>()
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
      @click="emit('history')"
    >
      {{ t('Activity.logs') }}
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
              hasPermission="charging/FinanceActivity:save"
              :disabled="busy"
              @click="emit('edit')"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
          </a-menu-item>
          <a-menu-item>
            <a-popconfirm
              :title="t('Activity.stateConfirm')"
              :ok-text="t('Finance.save')"
              :cancel-text="t('Finance.cancel')"
              @confirm="emit('state')"
            >
              <j-permission-button
                type="link"
                hasPermission="charging/FinanceActivity:state"
                :disabled="busy"
              >
                {{ t(row.activity.enabled ? 'Activity.disable' : 'Activity.enable') }}
              </j-permission-button>
            </a-popconfirm>
          </a-menu-item>
          <a-menu-item>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceActivity:date"
              :disabled="busy"
              @click="emit('date', true)"
            >
              {{ t('Activity.extend') }}
            </j-permission-button>
          </a-menu-item>
          <a-menu-item>
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceActivity:date"
              :disabled="busy || row.runtimeStatus === 'ENDED'"
              @click="emit('date', false)"
            >
              {{ t('Activity.endEarly') }}
            </j-permission-button>
          </a-menu-item>
          <a-menu-item>
            <a-popconfirm
              :title="t('Activity.deleteConfirm')"
              :ok-text="t('Finance.delete')"
              :cancel-text="t('Finance.cancel')"
              @confirm="emit('delete')"
            >
              <j-permission-button
                type="link"
                danger
                hasPermission="charging/FinanceActivity:delete"
                :disabled="busy"
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
