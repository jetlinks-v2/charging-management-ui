<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SelectableListCard from '@jetlinks-web-core/components/SelectableListCard'
import type { ProjectOption } from '../../../api/project'
import { useProjectPicker } from '../../../hooks/project/useProjectPicker'
const props = defineProps<{
  open: boolean
  projects: readonly ProjectOption[]
  currentId: string
  selectedIds?: readonly string[]
  multiple?: boolean
  required?: boolean
  loading: boolean
  failed: boolean
  switching: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', ids: string[]): void; (e: 'refresh'): void }>()
const { t } = useI18n()
const k = 'ProjectContext.'
const {
  pending,
  keyword,
  organization,
  page,
  tree,
  path,
  matches,
  visible,
  candidates,
  allMatched,
  exceedsLimit,
  toggle,
  toggleMatched,
  selectOrganization
} = useProjectPicker(props)
</script>
<template>
  <a-modal
    :open="open"
    :width="1040"
    :title="t(k + 'choose')"
    :footer="null"
    :closable="!required"
    :mask-closable="false"
    :keyboard="!required"
    class="project-picker-modal"
    @cancel="emit('close')"
  >
    <div class="project-picker">
      <aside class="project-picker__organizations">
        <div class="project-picker__heading">{{ t(k + 'organizations') }}</div>
        <a-button
          type="text"
          block
          :class="{ 'project-picker__all': !organization }"
          @click="organization = ''"
        >
          {{ t(k + 'all') }}
        </a-button>
        <a-tree
          :key="String(open)"
          :tree-data="tree"
          :selected-keys="organization ? [organization] : []"
          default-expand-all
          block-node
          @select="selectOrganization"
        />
      </aside>
      <section class="project-picker__content">
        <div class="project-picker__search">
          <a-input
            v-model:value="keyword"
            allow-clear
            :placeholder="t(k + 'search')"
            :aria-label="t(k + 'search')"
          >
            <template #prefix><AIcon type="SearchOutlined" /></template>
          </a-input>
          <a-button
            :loading="loading"
            :aria-label="t(k + 'refresh')"
            @click="emit('refresh')"
          >
            <AIcon type="ReloadOutlined" />
          </a-button>
        </div>
        <div class="project-picker__summary">
          <span>{{ t(k + 'available', { count: matches.length }) }}</span>
          <a-checkbox
            v-if="multiple"
            :checked="allMatched"
            :disabled="loading || switching || !matches.length || (!allMatched && exceedsLimit)"
            @change="toggleMatched"
          >
            {{ t(k + 'selectMatching') }}
          </a-checkbox>
        </div>
        <div
          v-if="multiple"
          class="project-picker__limit"
        >
          {{ t(k + 'multipleHint', { count: pending.length }) }}
        </div>
        <a-spin :spinning="loading">
          <div class="project-picker__list">
            <SelectableListCard
              v-for="project in visible"
              :key="project.id"
              :active="pending.includes(project.id)"
              :disabled="loading || switching"
              @click="toggle(project.id)"
            >
              <div class="project-picker__row">
                <div class="project-picker__name">
                  <AIcon type="EnvironmentOutlined" />
                  <strong>{{ project.name }}</strong>
                </div>
                <a-tag
                  v-if="project.id === currentId"
                  color="blue"
                >
                  {{ t(k + 'current') }}
                </a-tag>
                <AIcon
                  v-if="pending.includes(project.id)"
                  type="CheckCircleFilled"
                  class="project-picker__check"
                />
              </div>
              <div
                class="project-picker__path"
                :title="path(project)"
              >
                {{ path(project) }}
              </div>
            </SelectableListCard>
            <CloudEmpty
              v-if="!visible.length && !loading"
              :description="t(k + (failed ? 'failed' : 'empty'))"
            />
          </div>
        </a-spin>
        <a-pagination
          v-if="matches.length > 6"
          v-model:current="page"
          :total="matches.length"
          :page-size="6"
          :show-size-changer="false"
          size="small"
          class="project-picker__pagination"
        />
      </section>
    </div>
    <div class="project-picker__footer">
      <span
        class="project-picker__selection"
        :title="candidates.map((p) => p.name).join('、')"
      >
        {{
          candidates.length
            ? t(k + 'selected', { name: candidates.map((p) => p.name).join('、') })
            : t(k + 'selectHint')
        }}
      </span>
      <a-space>
        <a-button
          :disabled="switching || required"
          @click="emit('close')"
        >
          {{ t(k + 'cancel') }}
        </a-button>
        <a-button
          type="primary"
          :disabled="!candidates.length || candidates.length > 100 || loading"
          :loading="switching"
          @click="emit('confirm', pending)"
        >
          {{ t(k + 'confirm') }}
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>
<style scoped src="./project-picker.css"></style>
