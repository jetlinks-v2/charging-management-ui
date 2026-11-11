<script setup lang="ts">
import {computed} from 'vue'
import {roomsState} from '../services/rooms'
const location=computed(()=>{
 const room=roomsState.selected
 if(!room)return ''
 const parts=room.fullName.split('/').filter(Boolean)
 if(parts[0]===room.projectName)parts.shift()
 if(parts[parts.length-1]===room.name)parts.pop()
 return parts.join(' / ')
})
</script>
<template><button class="room-switch" @click="roomsState.choosing=true">
 <span class="room-name"><strong>{{roomsState.selected?roomsState.selected.projectName+' · '+roomsState.selected.name:'选择我的房屋'}}</strong><span v-if="location" class="room-location">{{location}}</span></span>
 <span class="switch-label">切换 <van-icon name="arrow-down"/></span>
</button></template>
