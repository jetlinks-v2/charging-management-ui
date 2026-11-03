import type { CustomerCreate, CustomerProfile, RelationInput } from '../api/archive'
/** 企业请求彻底剔除个人证件与家庭字段，切换类型时不泄漏隐藏表单值。 */
export function profilePayload(model: CustomerProfile, type: 'person' | 'company'): CustomerProfile {
  const common = {
    name: model.name.trim(),
    telephone: model.telephone.trim(),
    email: model.email || undefined,
    address: model.address || undefined
  }
  return type === 'person'
    ? {
        ...common,
        certificateType: model.certificateType || undefined,
        certificateNumber: model.certificateNumber || undefined
      }
    : {
        ...common,
        creditCode: model.creditCode || undefined,
        legalRepresentative: model.legalRepresentative || undefined,
        registeredAddress: model.registeredAddress || undefined
      }
}
export function relationshipPayload(model: RelationInput, type: 'person' | 'company'): RelationInput {
  const common = { spaceId: model.spaceId, startTime: Number(model.startTime) }
  return type === 'company'
    ? common
    : {
        ...common,
        nature: model.nature,
        familyMode: model.familyMode,
        ...(model.familyMode === 'new' ? { familyName: model.familyName?.trim() } : { familyId: model.familyId })
      }
}
export function createPayload(
  userId: string,
  customerType: 'person' | 'company',
  profile: CustomerProfile,
  relation: RelationInput
): CustomerCreate {
  return {
    userId,
    customerType,
    ...profilePayload(profile, customerType),
    ...relationshipPayload(relation, customerType)
  }
}
