import {computed,onBeforeUnmount,onMounted,ref,shallowRef} from 'vue'
import {loginRequest} from '../api/login'
import type {CaptchaConfig} from '../api/login'
import type {PreparedCaptcha} from '../services/projectLogin'
import {state} from '../services/session'
import {errorText} from '../api/http'

/** 登录页提前取得图片验证码；提交时复用当前图片的key，不再等点击登录才加载。 */
export function useLoginCaptcha(){
 const config=shallowRef<CaptchaConfig>(),code=ref(''),image=ref(''),key=ref(''),loading=ref(false),error=ref('')
 const controller=new AbortController();let generation=0
 const imageEnabled=computed(()=>config.value?.enabled&&config.value.type==='image')
 const prepared=computed<PreparedCaptcha|undefined>(()=>config.value?{config:config.value,result:imageEnabled.value&&key.value&&code.value.trim()?{verifyKey:key.value,verifyCode:code.value.trim()}:undefined}:undefined)
 const ready=computed(()=>!!config.value&&!loading.value&&!error.value&&(!imageEnabled.value||!!key.value&&!!code.value.trim()))
 async function refresh(){
  const version=++generation;loading.value=true;error.value='';code.value='';key.value='';image.value=''
  try{
   const current=config.value||await loginRequest<CaptchaConfig>(state.config,'/authorize/captcha/config',undefined,{signal:controller.signal})
   if(version!==generation)return
   config.value=current
   if(current.enabled&&current.type==='image'){
    const result=await loginRequest<{base64:string;key:string}>(state.config,'/authorize/captcha/image?width=160&height=44',undefined,{signal:controller.signal})
    if(version!==generation)return
    if(!result.key||!result.base64)throw Error('验证码加载失败，请重试')
    image.value=result.base64;key.value=result.key
   }
  }catch(e){if(version===generation&&!controller.signal.aborted)error.value=errorText(e)}
  finally{if(version===generation)loading.value=false}
 }
 onMounted(refresh);onBeforeUnmount(()=>{generation++;controller.abort()})
 return {config,code,image,loading,error,imageEnabled,prepared,ready,refresh}
}
