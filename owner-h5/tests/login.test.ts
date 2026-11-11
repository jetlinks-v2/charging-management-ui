import {afterEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,nextTick} from 'vue'
import {loginApplication} from '../src/services/projectLogin'
import {useLoginCaptcha} from '../src/hooks/useLoginCaptcha'

const originalFetch=globalThis.fetch
const config={title:'房屋',apiBase:'/api',allowedHostOrigins:[]},input={username:'owner',password:'encrypted',tenantDomain:'tenant'}
const captcha={enabled:true,type:'image',loginWithVerify:false}
const response=(result:unknown,status=200)=>new Response(JSON.stringify({status,result,message:'验证码错误'}),{status})
const flush=async()=>{for(let i=0;i<8;i++){await nextTick();await new Promise(resolve=>setTimeout(resolve,0))}}
const renderer=createRenderer<object,object>({patchProp(){},insert(){},remove(){},createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode:()=>null,nextSibling:()=>null})
let mounted:ReturnType<typeof renderer.createApp>|undefined
afterEach(()=>{mounted?.unmount();mounted=undefined;globalThis.fetch=originalFetch})

test('打开登录页即取得验证码图片，刷新清除旧输入，图片和key一起替换',async()=>{
 const paths:string[]=[];let number=0
 globalThis.fetch=async url=>{paths.push(String(url));return String(url).includes('/config')?response(captcha):response({key:'image-'+(++number),base64:'data:image/png;base64,fixture'+number})}
 let vm!:ReturnType<typeof useLoginCaptcha>
 mounted=renderer.createApp({setup(){vm=useLoginCaptcha();return()=>null}});mounted.mount({})
 await flush();assert.equal(paths.length,2);assert.equal(vm.image.value,'data:image/png;base64,fixture1');assert.equal(vm.ready.value,false)
 vm.code.value='ABCD';assert.equal(vm.ready.value,true);assert.equal(vm.prepared.value?.result?.verifyKey,'image-1')
 const refresh=vm.refresh();assert.equal(vm.code.value,'');assert.equal(vm.ready.value,false)
 await refresh;assert.equal(vm.prepared.value?.result,undefined);assert.equal(vm.image.value,'data:image/png;base64,fixture2')
})

test('验证码加载失败阻止提交，重试成功后恢复',async()=>{
 let fail=true
 globalThis.fetch=async url=>String(url).includes('/config')?response(captcha):fail?response(null,503):response({key:'key',base64:'data:image/png;base64,image'})
 let vm!:ReturnType<typeof useLoginCaptcha>
 mounted=renderer.createApp({setup(){vm=useLoginCaptcha();return()=>null}});mounted.mount({});await flush()
 assert.equal(vm.ready.value,false);assert.ok(vm.error.value)
 fail=false;await vm.refresh();vm.code.value='ABCD';assert.equal(vm.ready.value,true);assert.equal(vm.error.value,'')
})

test('图片预先填写后一次提交登录，不再等待第二次输入验证码',async()=>{
 const calls:{url:string;body:Record<string,unknown>}[]=[]
 globalThis.fetch=async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init?.body as string)});return response({token:'identity'})}
 const identity=await loginApplication(config,input,async()=>{throw Error('不应重复要求验证码')},undefined,{config:captcha,result:{verifyKey:'key',verifyCode:'ABCD'}})
 assert.deepEqual(identity,{token:'identity',tenantDomain:'tenant'})
 assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/authorize/login');assert.equal(calls[0].body.verifyKey,'key');assert.equal(calls[0].body.verifyCode,'ABCD')
})

test('未填写验证码不能发送登录请求，服务端验证码错误不生成身份',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return response(null,400)}
 await assert.rejects(loginApplication(config,input,async()=>({}),undefined,{config:captcha}),/请输入验证码/)
 assert.equal(calls,0)
 await assert.rejects(loginApplication(config,input,async()=>({}),undefined,{config:captcha,result:{verifyKey:'key',verifyCode:'wrong'}}),/验证码错误/)
 assert.equal(calls,1)
})
