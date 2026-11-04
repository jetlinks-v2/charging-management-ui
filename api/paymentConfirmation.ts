/** 资金确认使用同一请求号恢复未知结果，不允许改载荷重试。 */
export interface PaymentRequest<I> {
  requestId: string
  token: string
  input: I
}
export interface PendingPayment<I, P> {
  request: PaymentRequest<I>
  preview: P
}
export interface PaymentRecovery<I, P> {
  read: () => PendingPayment<I, P> | undefined
  write: (value: PendingPayment<I, P>) => void
  clear: () => void
}
