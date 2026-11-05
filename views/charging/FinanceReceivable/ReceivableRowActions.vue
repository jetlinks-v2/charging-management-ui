<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Receivable, ReceivableAction, ReceivableReviewAction } from '../../../api/financeReceivable'
import { receivablePermission } from '../../../hooks/finance-receivable/useReceivableWorkspace'
defineProps<{ row: Receivable; readonly?: boolean }>()
const emit = defineEmits<{
  select: [mode?: true | 'SPLIT']
  action: [action: ReceivableAction]
  review: [action: ReceivableReviewAction]
}>()
const { t } = useI18n()
const actions = (row: Receivable) =>
  (['FREEZE', 'UNFREEZE', 'DELETE'] as ReceivableAction[]).filter((action) => row.allowedOperations.includes(action))
const reviews = (row: Receivable) =>
  (['APPROVE', 'REJECT', 'UNAPPROVE'] as ReceivableReviewAction[]).filter((action) =>
    row.allowedOperations.includes(action)
  )
</script>
<template>
  <a-space :size="0">
    <a-button
      type="link"
      size="small"
      @click="emit('select')"
    >
      {{ t('Finance.detail') }}
    </a-button>
    <template v-if="!readonly">
      <j-permission-button
        v-if="row.allowedOperations.includes('ADJUST')"
        type="link"
        size="small"
        :hasPermission="`${receivablePermission}:adjust`"
        @click="emit('select', true)"
      >
        {{ t('Adjustment.title') }}
      </j-permission-button>
      <a-dropdown
        v-if="actions(row).length || reviews(row).length || row.allowedOperations.includes('SPLIT')"
        :trigger="['click']"
      >
        <a-button
          type="text"
          size="small"
          :aria-label="t('Setting.more')"
        >
          <AIcon type="MoreOutlined" />
        </a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item
              v-for="review in reviews(row)"
              :key="review"
            >
              <j-permission-button
                type="text"
                :hasPermission="`${receivablePermission}:${review.toLowerCase()}`"
                @click="emit('review', review)"
              >
                {{ t('ReceivableReview.action.' + review) }}
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
                :danger="action === 'DELETE'"
                :hasPermission="`${receivablePermission}:${action === 'DELETE' ? 'delete' : 'freeze'}`"
                @click="emit('action', action)"
              >
                {{ t('Receivable.operation.' + action) }}
              </j-permission-button>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
  </a-space>
</template>
