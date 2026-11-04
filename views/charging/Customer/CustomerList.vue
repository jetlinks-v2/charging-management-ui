<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Customer, Query, Relationship, Scope, Space } from '../../../api/archive'
import { useCustomerList } from '../../../hooks/archive/useCustomerList'
import { useCustomerDetail } from '../../../hooks/archive/useCustomerDetail'
import { useDictionaries } from '../../../hooks/archive/useDictionaries'
import CustomerCreate from './CustomerCreate.vue'
import CustomerDetail from './CustomerDetail.vue'
import ExcelActions from '../components/ExcelActions.vue'
const props = defineProps<{ scope: Scope; space?: Space; projectName?: string }>()
const { t } = useI18n()
const k = 'Archive.'
const dictionary = useDictionaries()
const { table, history, creating, failed, houseLoading, houseFailed, houseCompleted, request, reload, saved } =
  useCustomerList(props.scope, props.space)
const detail = useCustomerDetail(props.scope, reload)
watch([houseFailed, failed], ([houseError, listError]) => {
  if (houseError || listError) onlyMessage(t(k + (houseError ? 'houseFailed' : 'loadFailed')), 'error')
})
const terms = ref([])
const params = ref<Query>({ terms: [] })
watch(history, () => {
  terms.value = []
  params.value = { terms: [] }
})
const fields = computed(() => [
  { title: t(k + 'name'), dataIndex: 'name', search: { type: 'string' } },
  { title: t(k + 'telephone'), dataIndex: 'telephone', search: { type: 'string' } },
  {
    title: t(k + 'customerType'),
    dataIndex: 'customerType',
    search: { type: 'select', options: ['person', 'company'].map((value) => ({ value, label: t(k + value) })) }
  },
  {
    title: t(k + 'nature'),
    dataIndex: 'nature',
    search: { type: 'select', options: dictionary.options('customer-nature') }
  }
])
const columns = computed(() => [
  { title: t(k + 'customer'), dataIndex: 'customer', scopedSlots: true, width: 170 },
  { title: t(k + 'telephone'), dataIndex: 'telephone', scopedSlots: true, width: 145 },
  { title: t(k + 'relationships'), dataIndex: 'relationships', scopedSlots: true, width: 280 },
  { title: t(k + 'actions'), dataIndex: 'actions', scopedSlots: true, width: history.value ? 100 : 240, fixed: 'right' }
])
const customer = (record: Customer | Relationship) => ('customerId' in record ? record.customer : record)
const relationships = (record: Customer | Relationship): Relationship[] =>
  'customerId' in record ? [record] : record.relationships
const select = (record: Customer | Relationship) =>
  'customerId' in record
    ? detail.select(record.customerId, record, 'view', true)
    : detail.select(record.id, record.relationships[0])
const change = ({ filter }: ConditionFilterChangePayload) => {
  params.value = { terms: filter.terms as Query['terms'] }
}
</script>
<template>
  <a-tabs
    :active-key="history ? 'history' : 'current'"
    @change="
      (key: string | number) => {
        history = key === 'history'
        detail.close()
      }
    "
  >
    <a-tab-pane
      key="current"
      :tab="t(k + 'currentCustomers')"
    />
    <a-tab-pane
      key="history"
      :tab="t(k + 'historyCustomers')"
    />
  </a-tabs>
  <ConditionFilter
    :key="String(history)"
    v-model="terms"
    :fields="fields"
    @change="change"
  />
  <div class="archive-actions">
    <span class="archive-muted">
      {{ t(k + (space?.leaf ? (houseCompleted ? 'multipleCustomers' : 'completeFirst') : 'selectLeaf')) }}
    </span>
    <ExcelActions
      :project-name="projectName"
      kind="customer"
      :scope="scope"
      :query="params"
      :history="history"
      @imported="reload"
    />
    <j-permission-button
      v-if="!history"
      hasPermission="charging/Customer:save"
      type="primary"
      :disabled="!space?.leaf || !houseCompleted || houseLoading || houseFailed"
      @click="creating = true"
    >
      {{ t(k + 'addCustomer') }}
    </j-permission-button>
  </div>
  <router-link
    v-if="space?.leaf && !houseCompleted && !houseLoading && !houseFailed && !history"
    to="/charging/basic/spaces"
  >
    {{ t(k + 'goCompleteHouse') }}
  </router-link>
  <j-pro-table
    :key="String(history)"
    ref="table"
    :row-key="history ? 'id' : 'recordId'"
    mode="TABLE"
    type="PAGE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: 900 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
  >
    <template #customer="record">
      <div class="archive-name">
        <b>{{ customer(record)?.name || '—' }}</b>
        <span>
          <a-tag>{{ customer(record) ? t(k + customer(record)!.customerType) : '—' }}</a-tag>
        </span>
      </div>
    </template>
    <template #telephone="record">{{ customer(record)?.telephone || '—' }}</template>
    <template #relationships="record">
      <div
        v-for="relation in relationships(record)"
        :key="relation.id"
        class="archive-name"
      >
        <b>{{ relation.fullName || relation.spaceName }}</b>
        <small class="archive-muted">
          {{
            customer(record)?.customerType === 'person'
              ? dictionary.text('customer-nature', relation.nature) + ' · '
              : ''
          }}{{ new Date(relation.startTime).toLocaleString()
          }}{{ relation.endTime ? ' ~ ' + new Date(relation.endTime).toLocaleString() : '' }}
        </small>
      </div>
    </template>
    <template #actions="record">
      <div class="archive-row-actions">
        <a-button
          type="link"
          @click="select(record)"
        >
          {{ t(k + 'detail') }}
        </a-button>
        <template v-if="!history">
          <j-permission-button
            hasPermission="charging/Customer:save"
            type="link"
            :disabled="detail.busy.value"
            @click="detail.select(record.id, record.relationships[0], 'edit')"
          >
            {{ t(k + 'edit') }}
          </j-permission-button>
          <a-popconfirm
            :title="t(k + 'deleteCustomerConfirm')"
            :disabled="detail.busy.value"
            @confirm="detail.removeRelation(record.relationships[0])"
          >
            <j-permission-button
              hasPermission="charging/Customer:delete"
              type="link"
              danger
              :disabled="detail.busy.value"
            >
              {{ t(k + 'delete') }}
            </j-permission-button>
          </a-popconfirm>
        </template>
      </div>
    </template>
    <template #emptyText>
      <CloudEmpty :description="t(k + (failed ? 'loadFailed' : history ? 'noHistory' : 'noCustomers'))" />
    </template>
  </j-pro-table>
  <CustomerCreate
    v-if="creating && space"
    :scope="scope"
    :space="space"
    @close="creating = false"
    @saved="saved"
  />
  <CustomerDetail :state="detail" />
</template>
