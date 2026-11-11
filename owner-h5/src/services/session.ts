import { reactive } from 'vue'
import { randomId } from '../utils/randomId'
import type { Authorization, LoginIdentity, OwnerApplication, RuntimeConfig, Session } from '../types'

const KEY = 'finance-owner-h5:application-session'
export const state = reactive<{
 config: RuntimeConfig; identity?: LoginIdentity; session?: Session; authorization?: Authorization
 applications: OwnerApplication[]; application?: OwnerApplication; requestedApplicationId?: string
 ready: boolean; revision: number
}>({ config: { title: '我的房屋', allowedHostOrigins: [], apiBase: '/api' }, applications: [], ready: false, revision: 0 })

/** URL 仅声明期望进入的应用，不能替代服务端成员和应用权限核验。 */
export function entryApplication(search: string, hash = '') {
 const values = [new URLSearchParams(search), new URLSearchParams(hash.split('?')[1] || '')]
 const ids = values.flatMap(params => ['applicationId', 'applicationScope'].flatMap(key => params.getAll(key)))
  .map(value => value.replace(/^business_application:/, '').trim())
 if (ids.some(id => !/^[\w-]{1,64}$/.test(id)) || new Set(ids).size > 1) throw Error('应用链接无效，请重新打开')
 return ids[0]
}

export async function initializeConfig() {
 const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
 if (!response.ok) throw Error('无法加载应用配置')
 const config = await response.json() as RuntimeConfig
 if (typeof config.apiBase !== 'string' || !config.apiBase.startsWith('/') || config.apiBase.startsWith('//')
  || /[\\?#]/.test(config.apiBase)) throw Error('接口须配置为同源路径')
 state.config = { title: config.title || '我的房屋', allowedHostOrigins: config.allowedHostOrigins || [], apiBase: config.apiBase.replace(/\/$/, '') }
 document.title = state.config.title
 state.requestedApplicationId = entryApplication(location.search, location.hash)
 sessionStorage.removeItem('finance-owner-h5:session')
 try {
  const stored = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Partial<Session> | null
  if (stored && typeof stored.token === 'string' && stored.token.trim() && typeof stored.tenantDomain === 'string' && stored.tenantDomain.trim()) {
   state.identity = { token: stored.token, tenantDomain: stored.tenantDomain }
   // 保存的应用仍须重新枚举和核验，验证前不能发送业务请求。
   if (!state.requestedApplicationId && typeof stored.applicationId === 'string') state.requestedApplicationId = stored.applicationId
  } else sessionStorage.removeItem(KEY)
 } catch { sessionStorage.removeItem(KEY) }
}

export function setIdentity(identity: LoginIdentity) {
 const target = state.requestedApplicationId
 clearSession()
 state.requestedApplicationId = target
 state.identity = identity
 sessionStorage.setItem(KEY, JSON.stringify(identity))
}
export function leaveApplication() {
 state.revision++
 state.session = undefined
 state.authorization = undefined
 state.application = undefined
 state.ready = false
 if (state.identity) sessionStorage.setItem(KEY, JSON.stringify(state.identity))
}
export function setSession(session: Session, authorization?: Authorization, application?: OwnerApplication) {
 leaveApplication()
 state.identity = { token: session.token, tenantDomain: session.tenantDomain }
 state.session = session
 state.authorization = authorization
 state.application = application
 state.ready = true
 sessionStorage.setItem(KEY, JSON.stringify(session))
}
export function clearSession() {
 leaveApplication()
 state.identity = undefined
 state.applications = []
 state.requestedApplicationId = undefined
 sessionStorage.removeItem(KEY)
}
export const roleIds = () => state.authorization?.dimensions?.filter(d => d.type === 'role').map(d => d.id) || []

/** 受信宿主只交接身份和目标应用；由同一选择流程重新查询成员资格。 */
export function attachHostBridge(onSession: () => Promise<void>) {
 const nonce = randomId()
 const receive = async (event: MessageEvent) => {
  if (!state.config.allowedHostOrigins.includes(event.origin) || event.source !== window.parent || window.parent === window) return
  const data = event.data as { type?: string; nonce?: string; session?: Session }
  if (data?.type !== 'jetlinks.finance.owner.session' || data.nonce !== nonce || !data.session) return
  const s = data.session
  if (typeof s.token !== 'string' || !s.token || !/^[\w-]{1,64}$/.test(s.applicationId) || typeof s.tenantDomain !== 'string' || !s.tenantDomain.trim()) return
  setIdentity(s)
  state.requestedApplicationId = s.applicationId
  await onSession()
 }
 window.addEventListener('message', receive)
 if (window.parent !== window) for (const origin of state.config.allowedHostOrigins)
  window.parent.postMessage({ type: 'jetlinks.finance.owner.ready', nonce }, origin)
 return () => window.removeEventListener('message', receive)
}
