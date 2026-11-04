import type { MaybeRefOrGetter } from 'vue'
import type { FundInput, FundPreview } from '../../api/financeFunds'
import { usePaymentRecovery } from '../finance-cashier/usePaymentRecovery'
export function useFundRecovery(project: MaybeRefOrGetter<string>) {
  return usePaymentRecovery<FundInput, FundPreview>(project, 'charging:pending-fund', (input) => !!input.action)
}
