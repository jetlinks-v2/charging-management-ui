<script setup lang="ts">
import {reactive,watch} from 'vue'
import {useSession} from '../hooks/useSession'
import {useLoginCaptcha} from '../hooks/useLoginCaptcha'
import LoginVerification from '../components/LoginVerification.vue'
import {state} from '../services/session'
const captcha=reactive(useLoginCaptcha()),vm=reactive(useSession(()=>captcha.prepared))
watch(()=>vm.error,error=>{if(error&&captcha.imageEnabled)void captcha.refresh()})
</script>
<template>
 <section class="login-page">
  <div class="login-brand"><span class="login-symbol"><van-icon name="home-o"/></span><h1>{{state.config.title}}</h1></div>
  <section class="login-form"><h2>登录</h2>
   <van-notice-bar v-if="vm.error" :text="vm.error" color="#a83425" background="#fff0ed" wrapable/>
   <van-form @submit="vm.login">
    <van-cell-group inset>
     <van-field v-model="vm.form.tenantDomain" name="tenantDomain" :disabled="vm.loading" label="项目编码" placeholder="请输入项目编码" autocomplete="organization" :rules="[{required:true,message:'请输入项目编码'}]"/>
     <van-field v-model="vm.form.username" name="username" :disabled="vm.loading" label="账号" placeholder="请输入应用账号" autocomplete="username" :rules="[{required:true,message:'请输入账号'}]"/>
     <van-field v-model="vm.form.password" type="password" name="password" :disabled="vm.loading" label="密码" placeholder="请输入密码" autocomplete="current-password" :rules="[{required:true,message:'请输入密码'}]"/>
    </van-cell-group>
    <LoginVerification v-if="vm.verification" :key="vm.verification.key||vm.verification.contextToken" :requirement="vm.verification" @success="vm.completeVerification"/>
    <template v-else>
     <div v-if="captcha.imageEnabled" class="login-captcha-row">
      <van-field v-model="captcha.code" name="verifyCode" aria-label="验证码" placeholder="请输入验证码" autocomplete="off" :disabled="vm.loading||captcha.loading" :maxlength="8" :rules="[{required:true,message:'请输入验证码'}]"/>
      <van-button native-type="button" aria-label="刷新验证码" :loading="captcha.loading" :disabled="vm.loading" @click="captcha.refresh"><img v-if="captcha.image" :src="captcha.image" alt="图片验证码"/></van-button>
     </div>
     <div v-if="captcha.error" class="captcha-error" role="alert"><span>{{captcha.error}}</span><van-button native-type="button" size="small" @click="captcha.refresh">重新加载</van-button></div>
     <van-button type="primary" native-type="submit" block round :loading="vm.loading||captcha.loading" :disabled="!captcha.ready">登录</van-button>
    </template>
   </van-form>
  </section>
 </section>
</template>
