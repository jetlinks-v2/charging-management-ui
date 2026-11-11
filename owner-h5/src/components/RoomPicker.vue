<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {roomsState,selectRoom} from '../services/rooms'
import {nature} from '../services/format'
const keyword=ref('')
const choices=computed(()=>roomsState.rooms.filter(r=>(r.projectName+'/'+r.fullName).includes(keyword.value.trim())))
watch(()=>roomsState.choosing,()=>{keyword.value=''})
</script>
<template>
 <van-popup v-model:show="roomsState.choosing" class="owner-popup owner-room-picker" position="bottom" round teleport="body" safe-area-inset-bottom :closeable="!!roomsState.selected" :close-on-click-overlay="!!roomsState.selected">
  <h2 class="popup-title">选择我的房屋</h2>
  <van-search v-model="keyword" placeholder="搜索项目或空间路径"/>
  <div class="popup-content house-choices">
   <button v-for="room in choices" :key="room.projectId+room.spaceId" class="house-choice" @click="selectRoom(room)">
    <span><strong>{{room.projectName}} · {{room.name}}</strong><span class="room-location">{{room.fullName}}</span><van-tag type="primary" plain>{{nature(room.nature)}}</van-tag></span><van-icon v-if="room===roomsState.selected" name="success"/>
   </button>
   <van-empty v-if="!choices.length" description="没有匹配的房屋"/>
  </div>
 </van-popup>
</template>
