<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChargeSetting } from '../../../api/financeSetting'
defineProps<{ target: ChargeSetting; saving: boolean }>()
const emit = defineEmits<{ close: []; save: [string] }>()
const { t } = useI18n()
const endDate = ref('')
</script>
<template>
  <a-modal
    :open="true"
    :title="t('Setting.stop')"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: !endDate }"
    @cancel="!saving && emit('close')"
    @ok="emit('save', endDate)"
  >
    <p>
      <strong>{{ target.fullName }}</strong>
      · {{ target.subjectName }}
    </p>
    <p class="setting-stop-hint">{{ t('Setting.stopHint') }}</p>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Setting.end')"
        required
      >
        <a-date-picker
          v-model:value="endDate"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.setting-stop-hint {
  color: var(--ant-color-text-secondary, #595959);
  line-height: 1.8;
}
</style>
