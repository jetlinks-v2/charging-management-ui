<script setup lang="ts">
defineProps<{loading?:boolean;error?:string;empty?:boolean;emptyText?:string}>()
defineEmits<{retry:[]}>()
</script>
<template><div v-if="loading" class="state"><a-spin /><p>正在加载</p></div><div v-else-if="error" class="state"><p>{{error}}</p><a-button @click="$emit('retry')">重新加载</a-button></div><a-empty v-else-if="empty" class="state" :description="emptyText||'暂无数据'" :image="undefined"/><slot v-else /></template>
