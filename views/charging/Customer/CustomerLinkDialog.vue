<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import type { Customer, Relationship, Scope } from '../../../api/archive'
import { useCustomerLink } from '../../../hooks/archive/useCustomerLink'
import { useDictionaries } from '../../../hooks/archive/useDictionaries'
import RelationshipFields from './RelationshipFields.vue'
import DictionaryNotice from '../components/DictionaryNotice.vue'

const props = defineProps<{ scope: Scope; customer: Customer }>()
const emit = defineEmits<{ close: []; saved: [Relationship] }>()
const { t } = useI18n()
const k = 'Archive.'
const form = ref<FormInstance>()
const dictionary = useDictionaries()
const { spaces, loading, failed, houseLoading, ready, saving, relation, relationScope, selectSpace, load, save } =
  useCustomerLink(props.scope, props.customer, (value) => emit('saved', value))
const cancel = () => {
  if (!saving.value) emit('close')
}
const submit = async () => {
  try {
    await form.value?.validate()
  } catch {
    return
  }
  await save()
}
</script>
<template>
  <a-modal
    open
    :title="t(k + 'addRelationship')"
    :width="640"
    centered
    :mask-closable="false"
    :closable="!saving"
    :keyboard="!saving"
    @cancel="cancel"
  >
    <a-typography-title :level="5">{{ customer.name }}</a-typography-title>
    <a-typography-paragraph type="secondary">{{ t(k + 'newRelationshipHint') }}</a-typography-paragraph>
    <DictionaryNotice
      v-if="customer.customerType === 'person'"
      :dictionary="dictionary"
      :codes="['customer-nature']"
    />
    <a-button
      v-if="customer.customerType === 'person' && dictionary.failed.value"
      type="link"
      @click="dictionary.reload"
    >
      {{ t(k + 'retry') }}
    </a-button>
    <a-form
      ref="form"
      :model="relation"
      layout="vertical"
      :disabled="saving"
    >
      <a-form-item
        :label="t(k + 'house')"
        name="spaceId"
        :rules="[{ required: true, message: t(k + 'selectHouse') }]"
      >
        <a-select
          :value="relation.spaceId || undefined"
          show-search
          option-filter-prop="label"
          :loading="loading"
          :placeholder="t(k + 'selectHouse')"
          :options="spaces.map((item) => ({ value: item.id, label: item.spaceLocation || item.fullName || item.name }))"
          :not-found-content="t(k + (failed ? 'loadFailed' : 'noLinkableSpaces'))"
          @change="selectSpace"
        />
        <a-button
          v-if="failed"
          type="link"
          @click="load"
        >
          {{ t(k + 'retry') }}
        </a-button>
      </a-form-item>
      <a-spin :spinning="houseLoading">
        <RelationshipFields
          v-if="ready"
          :key="relation.spaceId"
          :model="relation"
          :type="customer.customerType"
          :dictionary="dictionary"
          :scope="relationScope"
        />
      </a-spin>
    </a-form>
    <template #footer>
      <a-button
        :disabled="saving"
        @click="cancel"
      >
        {{ t(k + 'cancel') }}
      </a-button>
      <j-permission-button
        hasPermission="charging/Customer:save"
        type="primary"
        :loading="saving"
        :disabled="!ready || loading || houseLoading || (customer.customerType === 'person' && dictionary.failed.value)"
        @click="submit"
      >
        {{ t(k + 'confirmLink') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
