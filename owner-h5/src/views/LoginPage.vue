<script setup lang="ts">
import {reactive} from 'vue'
import {HomeOutlined} from '@ant-design/icons-vue'
import {useSession} from '../hooks/useSession'
import LoginVerification from '../components/LoginVerification.vue'
const vm=reactive(useSession())
</script>
<template>
<section class="login-page">
 <div class="login-brand"><span class="login-symbol"><HomeOutlined/></span><h1>我的房屋</h1></div>
 <section class="login-form"><h2>登录</h2><a-alert v-if="vm.error" :message="vm.error" type="error" show-icon/>
  <a-form layout="vertical" :model="vm.form" @finish="vm.login">
   <a-form-item label="项目编码" name="tenantDomain" :rules="[{required:true,whitespace:true,message:'请输入项目编码'}]"><a-input v-model:value="vm.form.tenantDomain" placeholder="请输入项目编码" :disabled="vm.loading"/></a-form-item>
   <a-form-item label="账号" name="username" :rules="[{required:true,whitespace:true,message:'请输入账号'}]"><a-input v-model:value="vm.form.username" placeholder="请输入应用账号" autocomplete="username" :disabled="vm.loading"/></a-form-item>
   <a-form-item label="密码" name="password" :rules="[{required:true,message:'请输入密码'}]"><a-input-password v-model:value="vm.form.password" placeholder="请输入密码" autocomplete="current-password" :disabled="vm.loading"/></a-form-item>
   <a-form-item v-if="vm.verification" :label="vm.verification.config.type==='image'?'验证码':'安全验证'"><LoginVerification :requirement="vm.verification" @success="vm.completeVerification"/></a-form-item>
   <a-button v-else type="primary" html-type="submit" block size="large" :loading="vm.loading">登录</a-button>
  </a-form>
 </section>
</section>
</template>
