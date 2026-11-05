<script setup lang="ts">
import { FullPage } from '@jetlinks-web-core/layout'
</script>

<template>
  <j-page-container>
    <FullPage
      class="finance-page"
      :fixed="false"
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
</style>
