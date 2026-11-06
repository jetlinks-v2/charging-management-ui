import type { ReceivedSource } from '../api/financeReceivedReport'

/** 预收款与押金菜单、实收台账共用类型配色；退款统一橙色，文字继续说明业务类型。 */
export const collectionTypeColors: Readonly<Record<string, string | undefined>> = {
  RECEIVABLE: 'green',
  TEMPORARY: 'cyan',
  ADVANCE: 'blue',
  DEPOSIT: 'gold',
  REFUND: 'orange',
  TEMPORARY_REFUND: 'orange',
  ADVANCE_REFUND: 'orange',
  DEPOSIT_REFUND: 'orange'
} satisfies Record<ReceivedSource, string>
export type HandoverState = 'UNHANDED' | 'PENDING' | 'APPROVED'
export const handoverStateColors: Readonly<Record<string, string | undefined>> = {
  UNHANDED: 'orange',
  PENDING: 'blue',
  APPROVED: 'green'
} satisfies Record<HandoverState, string>
export const handoverStates: HandoverState[] = ['UNHANDED', 'PENDING', 'APPROVED']
