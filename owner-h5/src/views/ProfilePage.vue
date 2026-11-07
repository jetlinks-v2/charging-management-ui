<script setup lang="ts">
import {reactive} from 'vue'
import {UserOutlined,HomeOutlined,RightOutlined,FileTextOutlined,WalletOutlined,LogoutOutlined} from '@ant-design/icons-vue'
import {state} from '../services/session'
import {roomsState,selectRoom} from '../services/rooms'
import {useSession} from '../hooks/useSession'
const vm=reactive(useSession())
</script>
<template>
<section class="page profile-page">
 <div class="profile-identity"><span class="profile-avatar"><UserOutlined/></span><div><h2>{{state.authorization?.user.name||state.authorization?.user.username}}</h2><button @click="roomsState.choosing=true">我的房屋 · {{roomsState.rooms.length}}处 <RightOutlined/></button></div></div>
 <div class="section-heading"><h2>我的房屋</h2><button class="text-link" @click="roomsState.choosing=true">切换 <RightOutlined/></button></div>
 <div class="list-surface profile-room-list"><button v-for="room in roomsState.rooms" :key="room.projectId+room.spaceId" :aria-pressed="room===roomsState.selected" @click="selectRoom(room)"><span class="room-list-icon"><HomeOutlined/></span><span class="room-list-copy"><strong>{{room.projectName}} · {{room.name}}</strong><span>{{room.fullName}}</span></span><span v-if="room===roomsState.selected" class="selected-room">当前房屋</span><RightOutlined v-else/></button><p v-if="!roomsState.rooms.length" class="empty-inline">暂无关联房屋</p></div>
 <div class="list-surface profile-services"><router-link to="/records"><FileTextOutlined/><span>缴费记录</span><RightOutlined/></router-link><router-link to="/wallet"><WalletOutlined/><span>预存余额</span><RightOutlined/></router-link></div>
 <button class="logout-link" :disabled="vm.loading" @click="vm.logout"><LogoutOutlined/>{{vm.loading?'正在退出':'退出登录'}}</button>
</section>
</template>
