<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{ state: { open: boolean; url: string; title: string; filename: string } }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>
<template>
  <a-modal
    :open="state.open"
    :title="state.title"
    :width="1280"
    :body-style="{ padding: 0 }"
    @cancel="$emit('close')"
  >
    <iframe
      v-if="state.url"
      class="report-pdf"
      :src="state.url + '#view=FitH&navpanes=0'"
      :title="state.title"
      referrerpolicy="no-referrer"
    />
    <template #footer>
      <a-button @click="$emit('close')">{{ t('Finance.close') }}</a-button>
      <a-button
        :href="state.url"
        :download="state.filename + '.pdf'"
      >
        {{ t('Report.pdf') }}
      </a-button>
    </template>
  </a-modal>
</template>
<style scoped>
.report-pdf {
  display: block;
  width: 100%;
  height: 72vh;
  border: 0;
}
</style>
