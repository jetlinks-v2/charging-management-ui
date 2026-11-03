import { request as hostRequest, type Request } from '@jetlinks-web/core'

// 保留宿主统一鉴权、项目/应用上下文与错误处理，不另建请求实例。
const request: Pick<Request, 'get'> = hostRequest

/** 当前请求的收费上下文；projectId 为 null 表示尚未选择项目，不代表业务授权。 */
export interface ChargingContext {
  userId: string
  username: string
  projectId: string | null
}

/** 返回宿主标准响应包装，调用方按 success 判断结果后读取 result。 */
export const getChargingContext = () => request.get<ChargingContext>('/park/charging/context')
