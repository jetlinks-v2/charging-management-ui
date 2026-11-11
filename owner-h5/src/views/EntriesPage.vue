<script setup lang="ts">
import {reactive} from 'vue'
import {useRoute} from 'vue-router'
import LoadState from '../components/LoadState.vue'
import LedgerList from '../components/LedgerList.vue'
import {getEntries,getRoomEntries} from '../api/finance'
import {useRoomPage} from '../hooks/useRoomData'
const route=useRoute(),vm=reactive(useRoomPage((room,page)=>route.params.id==='entries'?getRoomEntries(room,page):getEntries(room,String(route.params.id),page)))
</script>
<template><section class="page"><LoadState :loading="vm.loading&&!vm.rows.length" :error="vm.error" :empty="!vm.rows.length" empty-text="暂无收支明细" @retry="vm.load(true)"><div class="entries-content"><LedgerList :entries="vm.rows"/></div><van-button v-if="vm.rows.length<vm.total" block :loading="vm.loading" @click="vm.load()">加载更多</van-button></LoadState></section></template>
