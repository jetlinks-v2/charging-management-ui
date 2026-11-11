<script setup lang="ts">
defineProps<{loading?:boolean;error?:string;empty?:boolean;emptyText?:string}>()
defineEmits<{retry:[]}>()
</script>
<template><div v-if="loading" class="state" role="status"><van-loading/><p>正在加载</p></div><div v-else-if="error" class="state" role="alert"><p>{{error}}</p><van-button @click="$emit('retry')">重新加载</van-button></div><van-empty v-else-if="empty" class="state" :description="emptyText||'暂无数据'"/><slot v-else/></template>
