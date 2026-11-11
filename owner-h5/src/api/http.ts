import { clearSession, state } from '../services/session'
import type { LoginIdentity, Session } from '../types'
export class ApiError extends Error { constructor(message: string, public status: number) { super(message) } }
/** 身份查询不带应用头；业务请求必须带已选应用，迟到响应不能污染新会话。 */
export async function request<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', scoped: boolean | 'identity' = true,
 session: LoginIdentity | Session | undefined = scoped === 'identity' ? state.identity : state.session): Promise<T> {
 if (!path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path)) throw new ApiError('接口地址无效', 400)
 if (scoped && (!session || scoped === true && !('applicationId' in session && session.applicationId))) throw new ApiError('请先选择收费应用', 401)
 const revision = state.revision
 const headers: Record<string, string> = { 'Accept-Language': 'zh-CN' }
 if (scoped && session) {
  headers['X-Access-Token'] = session.token; headers['X-Tenant-Domain'] = session.tenantDomain
  if (scoped === true && 'applicationId' in session) headers['X-Asset-Scope'] = 'business_application:' + session.applicationId
 }
 const multipart = body instanceof FormData
 if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
 const response = await fetch(state.config.apiBase + path, { method, headers, credentials: 'omit', body: body === undefined ? undefined : multipart ? body as FormData : JSON.stringify(body), signal: AbortSignal.timeout(60000) })
 if (revision !== state.revision) throw new ApiError('应用已切换，请重新操作', 409)
 const data = await response.json().catch(() => { throw new ApiError('服务暂不可用，请稍后重试', response.status) }) as { status?: number; message?: string; result: T }
 if (revision !== state.revision) throw new ApiError('应用已切换，请重新操作', 409)
 const status = data.status || response.status
 if (!response.ok || status !== 200) {
  if (scoped && status === 401 && session?.token === state.identity?.token) { clearSession(); window.dispatchEvent(new Event('finance-owner:session-expired')) }
  throw new ApiError((data.message || '请求失败').replaceAll('重新试算', '返回重新选择').replaceAll('试算', '金额'), status)
 }
 return data.result
}
export const errorText = (e: unknown) => e instanceof Error && e.name === 'TimeoutError' ? '请求超时，请重试' : e instanceof Error ? e.message : '操作失败，请重试'
