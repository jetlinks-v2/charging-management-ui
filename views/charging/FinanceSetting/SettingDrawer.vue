<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ChargeSetting, SettingOptions, SettingInput } from '../../../api/financeSetting'
import { useSettingForm } from '../../../hooks/finance-setting/useSettingForm'
import SettingDetail from './SettingDetail.vue'
import SettingHousePicker from './SettingHousePicker.vue'
import SettingRuleCard from './SettingRuleCard.vue'
import SettingTargets from './SettingTargets.vue'
const props = defineProps<{
  projectId: string
  detail?: ChargeSetting
  options: SettingOptions
  initialSpace?: string
  mode: 'single' | 'batch' | 'next'
  readOnly: boolean
  loading: boolean
  failed: boolean
  saving: boolean
}>()
const emit = defineEmits<{ close: []; save: [SettingInput[]] }>()
const { t } = useI18n()
const { form, rules, addRule, addHouses, addHouse, targets, pickerOpen, loadingHouse, submit } = useSettingForm(
  props,
  (inputs) => emit('save', inputs)
)
const keys = new WeakMap<SettingInput, number>()
let sequence = 0
function ruleKeys(rule: SettingInput) {
  if (!keys.has(rule)) keys.set(rule, ++sequence)
  return keys.get(rule)
}
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="920"
    icon="CalculatorOutlined"
    :title="
      t(
        readOnly
          ? 'Setting.detail'
          : mode === 'batch'
            ? 'Setting.batch'
            : mode === 'next'
              ? 'Setting.nextVersion'
              : detail
                ? 'Setting.edit'
                : 'Setting.create'
      )
    "
    :sub="detail?.fullName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 12 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <SettingDetail
      v-else-if="readOnly && detail"
      :detail="detail"
    />
    <a-form
      v-else
      ref="form"
      :model="{ rules }"
      layout="vertical"
      :disabled="saving"
      class="setting-form"
    >
      <SectionCard
        icon="HomeOutlined"
        :title="t('Setting.houseAndCustomer')"
      >
        <SettingTargets
          :state="{
            targets,
            busy: loadingHouse || saving,
            batch: mode === 'batch',
            canChoose: (!detail || mode === 'batch') && targets.length < Math.floor(200 / rules.length)
          }"
          @choose="pickerOpen = true"
        />
        <p
          v-if="targets.length"
          class="setting-help"
        >
          {{ t('Setting.sharedPayers') }}
        </p>
      </SectionCard>
      <div class="setting-rules">
        <SettingRuleCard
          v-for="(rule, index) in rules"
          :key="ruleKeys(rule)"
          :model="rule"
          :index="index"
          :options="options"
          :locked-subject="!!detail"
          :removable="!detail && rules.length > 1"
          @remove="rules.splice(index, 1)"
        />
        <a-button
          v-if="!detail"
          block
          type="dashed"
          :disabled="(rules.length + 1) * Math.max(1, targets.length) > 200"
          @click="addRule"
        >
          <AIcon type="PlusOutlined" />
          {{ t('Setting.addRule') }}
        </a-button>
      </div>
    </a-form>
    <template #foot>
      <a-button
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t(readOnly ? 'Finance.close' : 'Finance.cancel') }}
      </a-button>
      <a-button
        v-if="!readOnly && !loading && !failed"
        type="primary"
        :loading="saving"
        :disabled="loadingHouse"
        @click="submit"
      >
        {{ t('Setting.saveAndGenerate') }}
      </a-button>
    </template>
    <SettingHousePicker
      v-if="pickerOpen"
      :project-id="projectId"
      :busy="loadingHouse"
      :multiple="mode === 'batch'"
      :selected-ids="targets.map((target) => target.context.house.spaceId)"
      :limit="Math.floor(200 / rules.length)"
      @close="pickerOpen = false"
      @pick="addHouse"
      @pick-many="addHouses"
    />
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
<style scoped src="./SettingDrawer.css"></style>
