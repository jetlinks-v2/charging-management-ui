<script setup lang="ts">
import { FullPage } from '@jetlinks-web-core/layout'
import './collection-layout.css'

defineProps<{ fixed?: boolean; collection?: boolean }>()
</script>

<template>
  <j-page-container>
    <FullPage
      class="finance-page"
      :class="{ 'finance-page--fixed': fixed, 'finance-page--collection': collection }"
      :fixed="!!fixed"
      :flex="!!fixed"
      margin="0"
    >
      <slot />
    </FullPage>
  </j-page-container>
</template>

<style scoped>
.finance-page {
  display: flex;
  flex-direction: column;
  container-type: inline-size;
}
.finance-page--fixed {
  min-height: 0;
  overflow: hidden;
}
.finance-page--fixed > :deep(.project-scope-bar),
.finance-page--fixed > :deep(.cashier-pending-actions) {
  flex: none;
}
</style>
