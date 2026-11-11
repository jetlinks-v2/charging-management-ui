import { ApiError, request } from '../api/http'
import { leaveApplication, setSession, state } from './session'
import type { Authorization, OwnerApplication, Session } from '../types'

export const hasFinanceAccess = (authorization: Authorization) => !!authorization.user?.id && authorization.permissions?.some(
 permission => permission.id.startsWith('property-finance-') && permission.actions.includes('query'))

async function verifyApplication(application: OwnerApplication, revision: number) {
 if (!state.identity) throw new ApiError('请先登录', 401)
 const session: Session = { ...state.identity, applicationId: application.id }
 // /authorize/me 返回账号完整权限；/authorize/context 才是当前应用裁剪后的权限。
 const contextAuth = await request<{subject: Authorization['user']; permissions: Authorization['permissions']}>(
  '/authorize/context', undefined, 'GET', true, session)
 const authorization: Authorization = { user: contextAuth.subject, permissions: contextAuth.permissions }
 if (!hasFinanceAccess(authorization)) throw new ApiError('没有此收费应用的访问权限', 403)
 const context = await request<{ applicationId: string }>('/property/finance/owner/context', undefined, 'GET', true, session)
  .catch(error => { if (error instanceof ApiError && error.status === 404) throw new ApiError('收费服务尚未更新，请联系管理员', 503); throw error })
 if (context.applicationId !== application.id || revision !== state.revision) throw new ApiError('应用已变化，请重新选择', 409)
 return { session, authorization }
}

/** 平台列表只含真实成员应用；逐个校验收费权限，不按显示名称或部署实例ID猜测。 */
export async function discoverApplications() {
 const revision = state.revision
 const candidates = await request<OwnerApplication[]>('/business-application/me', undefined, 'GET', 'identity')
 const allowed: OwnerApplication[] = []
 // 保持有限并发，避免一个账号的大量应用同时请求认证和收费服务。
 for (let index = 0; index < candidates.length; index += 3) {
  const results = await Promise.all(candidates.slice(index, index + 3).map(async app => {
   try { await verifyApplication(app, revision); return app }
   catch (error) { if (error instanceof ApiError && error.status === 403) return undefined; throw error }
  }))
  if (revision !== state.revision) throw new ApiError('应用已变化，请重新选择', 409)
  allowed.push(...results.filter((app): app is OwnerApplication => !!app))
 }
 state.applications = allowed
 const target = state.requestedApplicationId
 if (target) {
  const app = allowed.find(app => app.id === target)
  if (!app) throw new ApiError('该收费应用不存在、已停用或当前账号无权访问', 403)
  await selectApplication(app.id)
 } else if (allowed.length === 1) await selectApplication(allowed[0].id)
 return allowed
}

export async function selectApplication(id: string) {
 const app = state.applications.find(item => item.id === id)
 if (!app) throw new ApiError('请从有权访问的收费应用中选择', 403)
 const revision = state.revision
 const verified = await verifyApplication(app, revision)
 setSession(verified.session, verified.authorization, app)
 state.requestedApplicationId = undefined
 // 移除过期入口参数，刷新后恢复用户刚选择的应用。
 const url = new URL(location.href)
 for (const key of ['applicationId', 'applicationScope']) url.searchParams.delete(key)
 const [path, query = ''] = url.hash.split('?'), params = new URLSearchParams(query)
 for (const key of ['applicationId', 'applicationScope']) params.delete(key)
 url.hash = path + (params.size ? '?' + params : '')
 history.replaceState(history.state, '', url)
}

export function beginApplicationSwitch() { leaveApplication(); state.requestedApplicationId = undefined }
