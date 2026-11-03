<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionCard from '@jetlinks-web-core/components/SectionCard/index.vue'
import KvGrid from '@jetlinks-web-core/components/KvGrid/index.vue'
import type { Relationship } from '../../../api/archive'
import type { useDictionaries } from '../../../hooks/archive/useDictionaries'
defineProps<{
  relationships: Relationship[]
  person: boolean
  historical: boolean
  readOnly: boolean
  busy: boolean
  dictionary: ReturnType<typeof useDictionaries>
}>()
const emit = defineEmits<{ end: [Relationship]; remove: [Relationship]; add: [] }>()
const { t } = useI18n()
const k = 'Archive.'
const date = (value?: number) => (value ? new Date(value).toLocaleString() : '—')
</script>
<template>
  <SectionCard
    icon="TeamOutlined"
    :title="t(k + 'relationInformation')"
  >
    <template
      v-if="!historical && !readOnly"
      #actions
    >
      <j-permission-button
        hasPermission="charging/Customer:save"
        type="primary"
        :disabled="busy"
        @click="emit('add')"
      >
        {{ t(k + 'addRelationship') }}
      </j-permission-button>
    </template>
    <CloudEmpty
      v-if="!relationships.length"
      :description="t(k + 'noRelationships')"
    />
    <div
      v-for="relation in relationships"
      :key="relation.id"
      class="archive-detail-group"
    >
      <h4>
        {{ relation.spaceLocation || relation.fullName || relation.spaceName }}
        <a-tag :color="historical ? undefined : 'green'">{{ t(k + (historical ? 'history' : 'current')) }}</a-tag>
      </h4>
      <KvGrid
        :items="[
          ...(person
            ? [
                { label: t(k + 'nature'), value: dictionary.text('customer-nature', relation.nature) },
                { label: t(k + 'family'), value: relation.familyName || '—' }
              ]
            : []),
          { label: t(k + 'startTime'), value: date(relation.startTime) },
          ...(historical
            ? [
                { label: t(k + 'endTime'), value: date(relation.endTime) },
                { label: t(k + 'endReason'), value: relation.endReason || '—' }
              ]
            : [])
        ]"
      />
      <div
        v-if="!historical && !readOnly"
        class="archive-row-actions"
      >
        <j-permission-button
          hasPermission="charging/Customer:save"
          type="link"
          :disabled="busy"
          @click="emit('end', relation)"
        >
          {{ t(k + 'endRelation') }}
        </j-permission-button>
        <a-popconfirm
          :title="t(k + 'deleteRelationConfirm')"
          @confirm="emit('remove', relation)"
        >
          <j-permission-button
            hasPermission="charging/Customer:delete"
            type="link"
            danger
            :disabled="busy"
          >
            {{ t(k + 'deleteRelation') }}
          </j-permission-button>
        </a-popconfirm>
      </div>
    </div>
  </SectionCard>
</template>
