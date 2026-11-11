<script setup lang="ts">
import {computed} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {state} from './services/session'
import {roomsState,loadRooms,currentRoom} from './services/rooms'
import LoadState from './components/LoadState.vue'
import RoomSwitcher from './components/RoomSwitcher.vue'
import RoomPicker from './components/RoomPicker.vue'
const route=useRoute(),router=useRouter(),login=computed(()=>['/login','/applications'].includes(route.path))
const root=computed(()=>['/','/wallet','/profile'].includes(route.path))
const titles:Record<string,string>={'/bills':'我的账单','/prepay':'费用预存','/confirm':'确认支付','/records':'缴费记录','/wallet':'预存余额','/profile':'我的'}
function back(){if(window.history.state?.back)router.back();else void router.replace('/')}

</script>
<template>
 <div class="app-shell">
  <router-view v-if="login"/>
  <template v-else>
   <header class="topbar" :class="{'root-bar':root}">
    <van-button v-if="!root" plain class="back-button" aria-label="返回" @click="back"><van-icon name="arrow-left"/></van-button>
    <h1>{{titles[route.path]||(route.path.startsWith('/wallet/')?'收支明细':'房屋服务')}}</h1>
    <router-link v-if="route.path==='/'" to="/records" class="header-link">缴费记录</router-link>
   </header>
   <main>
    <router-view v-if="route.path==='/profile'"/>
    <LoadState v-else :loading="roomsState.loading" :error="roomsState.error" :empty="!roomsState.rooms.length" empty-text="当前账号暂无有效关联房屋，请联系物业" @retry="loadRooms">
     <router-view v-if="currentRoom" :key="route.path+state.revision"/>
     <div v-else class="page"><RoomSwitcher/></div>
    </LoadState>
   </main>
   <nav v-if="root" class="bottom-nav" aria-label="主导航">
    <router-link to="/" :class="{active:route.path==='/'}"><van-icon name="home-o"/><span>房屋</span></router-link>
    <router-link to="/wallet" :class="{active:route.path==='/wallet'}"><van-icon name="balance-o"/><span>余额</span></router-link>
    <router-link to="/profile" :class="{active:route.path==='/profile'}"><van-icon name="user-o"/><span>我的</span></router-link>
   </nav>
   <RoomPicker/>
  </template>
 </div>
</template>
