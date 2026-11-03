<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import JlDrawerShell from '@jetlinks-web-core/components/JlDrawerShell/index.vue'
import '../components/archive-drawer.css'
import SectionCard from '@jetlinks-web-core/components/SectionCard/index.vue'
import KvGrid from '@jetlinks-web-core/components/KvGrid/index.vue'
import type { useCustomerDetail } from '../../../hooks/archive/useCustomerDetail'
import { useDictionaries } from '../../../hooks/archive/useDictionaries'
import CustomerProfileFields from './CustomerProfileFields.vue'
import CustomerRelations from './CustomerRelations.vue'
import CustomerEndDialog from './CustomerEndDialog.vue'
import CustomerLinkDialog from './CustomerLinkDialog.vue'
const props = defineProps<{ state: ReturnType<typeof useCustomerDetail> }>()
const { t } = useI18n()
const k = 'Archive.'
const dictionary = useDictionaries()
const form = ref<FormInstance>()
const customer = computed(() => props.state.customer.value)
const historical = computed(() => props.state.history.value)
const fields = computed(() => {
  const current = customer.value
  if (!current) return []
  const keys = [
    'telephone',
    'email',
    'address',
    ...(current.customerType === 'person'
      ? ['certificateType', 'certificateNumber']
      : ['creditCode', 'legalRepresentative', 'registeredAddress'])
  ] as const
  return keys.flatMap((key) => {
    const value = current[key as keyof typeof current]
    return [
      {
        label: t(k + key),
        value:
          key === 'certificateType'
            ? dictionary.text('certificate-type', current.certificateType)
            : String(value || '—')
      }
    ]
  })
})
const save = async () => {
  await form.value?.validate()
  await props.state.save()
}
</script>
<template>
  <JlDrawerShell
    class="charging-drawer"
    :open="state.open.value"
    :width="740"
    :content-wrapper-style="{ maxWidth: 'calc(100vw - 32px)' }"
    :title="t(k + (historical ? 'historyDetail' : state.editing.value ? 'editCustomer' : 'customerDetail'))"
    icon="UserOutlined"
    @update:open="state.close"
  >
    <a-spin :spinning="state.loading.value">
      <a-result
        v-if="state.failed.value"
        status="warning"
        :title="t(k + 'detailFailed')"
      >
        <template #extra>
          <a-button @click="state.select(state.selectedId.value)">{{ t(k + 'retry') }}</a-button>
        </template>
      </a-result>
      <div
        v-else-if="customer"
        class="archive-stack"
      >
        <div class="archive-summary">
          <span class="archive-summary__icon">
            <AIcon :type="customer.customerType === 'person' ? 'UserOutlined' : 'BankOutlined'" />
          </span>
          <div>
            <h2>{{ customer.name }}</h2>
            <a-tag color="blue">{{ t(k + customer.customerType) }}</a-tag>
            <a-tag v-if="customer.deleted">{{ t(k + 'deleted') }}</a-tag>
            <a-tag v-if="historical">{{ t(k + 'history') }}</a-tag>
          </div>
        </div>
        <CustomerRelations
          :relationships="historical ? [historical] : customer.relationships"
          :person="customer.customerType === 'person'"
          :historical="!!historical"
          :read-only="!state.editing.value"
          :busy="state.busy.value"
          :dictionary="dictionary"
          @end="state.beginEnd"
          @remove="state.removeRelation"
          @add="state.beginLink"
        />
        <SectionCard
          icon="IdcardOutlined"
          :title="t(k + 'profile')"
        >
          <a-form
            v-if="state.editing.value"
            ref="form"
            :model="state.profile"
            layout="vertical"
            class="archive-form"
            :disabled="state.busy.value"
          >
            <CustomerProfileFields
              :model="state.profile"
              :type="customer.customerType"
              :dictionary="dictionary"
            />
            <div class="wide archive-row-actions">
              <a-button
                :disabled="state.busy.value"
                @click="state.close"
              >
                {{ t(k + 'cancel') }}
              </a-button>
              <j-permission-button
                hasPermission="charging/Customer:save"
                type="primary"
                :loading="state.busy.value"
                @click="save"
              >
                {{ t(k + 'save') }}
              </j-permission-button>
            </div>
          </a-form>
          <KvGrid
            v-else
            :items="fields"
          />
        </SectionCard>
      </div>
    </a-spin>
    <template #foot>
      <a-button @click="state.close">{{ t(k + 'close') }}</a-button>
    </template>
  </JlDrawerShell>
  <CustomerEndDialog :state="state" />
  <CustomerLinkDialog
    v-if="state.linking.value && state.editing.value && customer && !historical"
    :scope="state.scope"
    :customer="customer"
    @close="state.linking.value = false"
    @saved="state.linked"
  />
</template>
