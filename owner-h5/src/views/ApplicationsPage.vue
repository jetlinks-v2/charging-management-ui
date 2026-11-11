<script setup lang="ts">
import {reactive} from 'vue'
import {state} from '../services/session'
import {useApplications} from '../hooks/useApplications'
import {useSession} from '../hooks/useSession'
const vm=reactive(useApplications()),session=reactive(useSession())
</script>
<template>
 <section class="page applications-page">
  <div class="application-heading"><span class="login-symbol"><van-icon name="home-o"/></span><h1>选择收费应用</h1></div>
  <van-loading v-if="vm.loading" vertical>正在核验应用权限</van-loading>
  <template v-else>
   <div v-if="vm.error" class="state" role="alert"><p>{{vm.error}}</p><van-button @click="vm.load">重试</van-button><van-button v-if="state.requestedApplicationId" plain @click="vm.showAll">查看可用应用</van-button></div>
   <div v-else-if="state.applications.length" class="list-surface application-list">
    <button v-for="app in state.applications" :key="app.id" @click="vm.choose(app.id)"><van-icon name="apps-o"/><strong>{{app.name}}</strong><van-icon name="arrow"/></button>
   </div>
   <van-empty v-else description="当前账号暂无可访问的收费应用"/>
  </template>
  <button class="logout-link" :disabled="session.loading" @click="session.logout">退出登录</button>
 </section>
</template>
