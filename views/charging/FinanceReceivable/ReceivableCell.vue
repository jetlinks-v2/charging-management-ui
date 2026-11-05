<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Receivable } from '../../../api/financeReceivable'
import type { ReceivableColumnOption } from '../../../utils/receivableColumns'
import { receivableCellText, receivableStatusColor } from '../../../utils/receivableDisplay'
const props = defineProps<{ row: Receivable; column: ReceivableColumnOption }>()
const emit = defineEmits<{ detail: [] }>()
const { t } = useI18n()
const text = computed(() => receivableCellText(props.row, props.column, t))
</script>
<template>
  <a-button
    v-if="column.key === 'fullName'"
    type="link"
    class="receivable-house"
    :title="text"
    @click="emit('detail')"
  >
    {{ text }}
  </a-button>
  <a-tag
    v-else-if="column.kind === 'status' && text !== '—'"
    :color="receivableStatusColor(row, column.key)"
  >
    {{ text }}
  </a-tag>
  <span
    v-else
    :class="{
      'receivable-money': column.kind === 'money' || column.kind === 'price',
      'receivable-arrears': column.key === 'arrears',
      'receivable-nowrap': ['date', 'period', 'days'].includes(column.kind || '')
    }"
    :title="text"
  >
    {{ text }}
  </span>
</template>
<style scoped>
.receivable-house {
  padding: 0;
  height: auto;
  text-align: left;
  white-space: normal;
}
.receivable-money {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.receivable-arrears {
  font-weight: 600;
}
.receivable-nowrap {
  white-space: nowrap;
}
</style>
