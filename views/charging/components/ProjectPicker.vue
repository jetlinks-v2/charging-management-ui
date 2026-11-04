<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectableListCard from '@jetlinks-web-core/components/SelectableListCard'
import type { ProjectOption } from '../../../api/project'
const props = defineProps<{
  open: boolean
  projects: readonly ProjectOption[]
  currentId: string
  loading: boolean
  failed: boolean
  switching: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', id: string): void; (e: 'refresh'): void }>()
const { t } = useI18n()
const k = 'ProjectContext.'
const pending = ref('')
const keyword = ref('')
const organization = ref('')
const page = ref(1)
interface TreeNode {
  key: string
  title: string
  children: TreeNode[]
}
const tree = computed(() => {
  const roots: TreeNode[] = []
  const nodes = new Map<string, TreeNode>()
  for (const project of props.projects) {
    let children = roots
    for (const item of project.organizationPath?.length ? project.organizationPath : [project]) {
      let node = nodes.get(item.id)
      if (!node) {
        node = { key: item.id, title: item.name, children: [] }
        nodes.set(item.id, node)
        children.push(node)
      }
      children = node.children
    }
  }
  return roots
})
const path = (project: ProjectOption) => project.organizationPath?.map((item) => item.name).join(' / ') || project.name
const matches = computed(() =>
  props.projects.filter(
    (project) =>
      (!organization.value ||
        project.id === organization.value ||
        project.organizationPath?.some((item) => item.id === organization.value)) &&
      `${project.name} ${path(project)}`.toLocaleLowerCase().includes(keyword.value.trim().toLocaleLowerCase())
  )
)
const visible = computed(() => matches.value.slice((page.value - 1) * 6, page.value * 6))
const candidate = computed(() => props.projects.find((project) => project.id === pending.value))
watch([keyword, organization], () => {
  page.value = 1
})
watch(
  () => props.open,
  (open) => {
    if (!open) return
    pending.value = props.currentId
    keyword.value = ''
    organization.value = ''
    page.value = 1
  }
)
watch(
  () => props.projects,
  () => {
    if (!props.projects.some((project) => project.id === pending.value)) pending.value = ''
    page.value = 1
  }
)
const selectOrganization = (keys: (string | number)[]) => {
  organization.value = keys.length ? String(keys[0]) : ''
}
</script>
<template>
  <a-modal
    :open="open"
    :width="1040"
    :title="t(k + 'choose')"
    :footer="null"
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
        <div class="project-picker__summary">{{ t(k + 'available', { count: matches.length }) }}</div>
        <a-spin :spinning="loading">
          <div class="project-picker__list">
            <SelectableListCard
              v-for="project in visible"
              :key="project.id"
              :active="pending === project.id"
              :disabled="loading || switching"
              @click="pending = project.id"
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
                  v-if="pending === project.id"
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
      <span>{{ candidate ? t(k + 'selected', { name: candidate.name }) : t(k + 'selectHint') }}</span>
      <a-space>
        <a-button
          :disabled="switching"
          @click="emit('close')"
        >
          {{ t(k + 'cancel') }}
        </a-button>
        <a-button
          type="primary"
          :disabled="!candidate || loading"
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
