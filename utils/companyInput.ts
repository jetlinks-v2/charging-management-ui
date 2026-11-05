import type { CompanyInput } from '../api/finance'
/** 仅发送可维护字段；稳定银行 ID 保留，审计及项目字段不能透传到共享主档。 */
export function companyInput(source: CompanyInput): CompanyInput {
  const {
    version,
    companyName,
    taxNumber,
    address,
    phone,
    depositBank,
    bankAccount,
    drawer,
    reviewer,
    estateNo,
    shop,
    legalPersonId,
    ratepayingNature,
    invoiceManufacturerCode,
    invoiceManufacturerName,
    invoiceExtensionNumber,
    departmentId,
    thirdpartyVendorId,
    quota
  } = source
  return {
    version,
    companyName,
    taxNumber,
    address,
    phone,
    depositBank,
    bankAccount,
    drawer,
    reviewer,
    estateNo,
    shop,
    legalPersonId,
    ratepayingNature,
    invoiceManufacturerCode,
    invoiceManufacturerName,
    invoiceExtensionNumber,
    departmentId,
    thirdpartyVendorId,
    quota,
    banks: source.banks.map(
      ({
        id,
        bankName,
        bankAccount,
        defaultBank,
        financingInstitution,
        jointLineNumber,
        accountName,
        accountNumber,
        accountBookId
      }) => ({
        id,
        bankName,
        bankAccount,
        defaultBank,
        financingInstitution,
        jointLineNumber,
        accountName,
        accountNumber,
        accountBookId
      })
    )
  }
}
