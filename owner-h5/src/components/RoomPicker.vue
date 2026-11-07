<script setup lang="ts">
import {computed,ref} from 'vue'
import {CheckOutlined} from '@ant-design/icons-vue'
import {roomsState,selectRoom} from '../services/rooms'
import {nature} from '../services/format'
const keyword=ref('')
const choices=computed(()=>roomsState.rooms.filter(r=>(r.projectName+'/'+r.fullName).includes(keyword.value.trim())))
</script>
<template><a-drawer root-class-name="owner-drawer owner-room-picker" v-model:open="roomsState.choosing" title="选择我的房屋" placement="bottom" height="auto" :closable="!!roomsState.selected" :mask-closable="!!roomsState.selected"><a-input-search v-model:value="keyword" placeholder="搜索项目或空间路径" allow-clear/><div class="house-choices"><button v-for="room in choices" :key="room.projectId+room.spaceId" class="house-choice" @click="selectRoom(room)"><span><strong>{{room.projectName}} · {{room.name}}</strong><span class="room-location">{{room.fullName}}</span><a-tag>{{nature(room.nature)}}</a-tag></span><CheckOutlined v-if="room===roomsState.selected" /></button><a-empty v-if="!choices.length" description="没有匹配的房屋" /></div></a-drawer></template>
