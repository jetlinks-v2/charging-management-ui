/** getRandomValues 在局域网 HTTP 下也可用，不依赖仅安全上下文提供的 randomUUID。 */
export function paymentRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('')
}
