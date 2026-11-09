<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import { receivableFields } from '../../../utils/receivableFields'
import { useReceivableFilters } from '../../../hooks/finance-receivable/useReceivableFilters'
import type { useReceivableWorkspace } from '../../../hooks/finance-receivable/useReceivableWorkspace'
const props = defineProps<{ state: ReturnType<typeof useReceivableWorkspace> }>()
const { t } = useI18n()
const fields = computed(() => receivableFields(t))
const { filter } = useReceivableFilters(props.state.terms, props.state.archive.projectId)
</script>
<template>
  <ConditionFilter
    :key="state.archive.projectId.value"
    class="receivable-filters"
    :fields="fields"
    :disabled="!state.archive.projectId.value"
    @change="filter"
  />
</template>
<style scoped>
.receivable-filters {
  margin-bottom: 20px;
}
</style>
