import { loginRequest,LoginApiError } from '../api/login'
import type { CaptchaConfig,VerificationHeaders } from '../api/login'
import type { RuntimeConfig,LoginIdentity } from '../types'

export interface CaptchaRequirement {config:CaptchaConfig;key?:string;contextToken?:string}
export interface CaptchaResult {verification?:VerificationHeaders;proof?:string;contextToken?:string;verifyKey?:string;verifyCode?:string}
export interface PreparedCaptcha {config:CaptchaConfig;result?:CaptchaResult}
export interface ApplicationLoginInput {username:string;password:string;tenantDomain:string;encryptId?:string}
export type CaptchaVerifier=(requirement:CaptchaRequirement)=>Promise<CaptchaResult>

/** 使用项目内账号认证；此处不选择应用，后续必须枚举并验证应用准入。 */
export async function loginApplication(config:RuntimeConfig,input:ApplicationLoginInput,verify:CaptchaVerifier,signal?:AbortSignal,prepared?:PreparedCaptcha){
 const username=input.username.trim(),code=input.tenantDomain.trim()
 if(!username||!input.password||!code)throw Error('请填写项目编码、应用账号及密码')
 // 与 PC 应用链接相同，账号原样提交；项目编码在后续应用授权时由服务端核验。
 const captcha=prepared?.config||await loginRequest<CaptchaConfig>(config,'/authorize/captcha/config',undefined,{signal})
 let proof:CaptchaResult=prepared?.result||{}
 if(prepared&&captcha.enabled&&captcha.type==='image'&&(!proof.verifyKey||!proof.verifyCode))throw Error('请输入验证码')
 if(captcha.enabled&&captcha.loginWithVerify===false&&!prepared?.result){
  if(captcha.type==='altcha'){
   if(!captcha.altcha)throw Error('安全验证配置不可用，请稍后重试')
   const context=await loginRequest<{contextToken:string}>(config,captcha.altcha.contextUrl,{operation:'login.captcha',target:username},{signal})
   proof=await verify({config:captcha,contextToken:context.contextToken})
  }else proof=await verify({config:captcha})
 }
 const body={username,password:input.password,encryptId:input.encryptId,expires:3600000,...proof}
 let account:{token:string}
 try{account=await loginRequest(config,'/authorize/login',body,{signal})}
 catch(error){
  if(!(error instanceof LoginApiError)||!error.verification)throw error
  const completed=await verify({config:captcha,key:error.verification.key})
  if(!completed.verification)throw Error('安全验证未完成，请重试')
  account=await loginRequest(config,'/authorize/login',body,{signal,verification:completed.verification})
 }
 if(!account.token)throw Error('应用登录未返回有效会话')
 const identity:LoginIdentity={token:account.token,tenantDomain:code}
 
 signal?.throwIfAborted()
 return identity
}
