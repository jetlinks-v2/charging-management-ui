import type { MaybeRefOrGetter } from 'vue'
import type { TemporaryInput, TemporaryPreview } from '../../api/financeTemporary'
import { usePaymentRecovery } from '../finance-cashier/usePaymentRecovery'
export function useTemporaryRecovery(project: MaybeRefOrGetter<string>) {
  return usePaymentRecovery<TemporaryInput, TemporaryPreview>(
    project,
    'charging:pending-temporary',
    (input) => !!input.spaceId && !!input.relationshipId && !!input.standardId && Array.isArray(input.tenders)
  )
}
