import { excelResponse } from './archiveFiles'

/** 网关错误不得作为PDF预览；除MIME外校验文件签名，阻止登录HTML或JSON被当成收据。 */
export async function receiptPdfResponse(response: unknown): Promise<Blob> {
  const blob = await excelResponse(response)
  if ((await blob.slice(0, 5).text()) !== '%PDF-') throw new Error('')
  return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
}
