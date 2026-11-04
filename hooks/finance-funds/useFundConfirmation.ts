import { previewFunds, confirmFunds, type FundRecovery } from '../../api/financeFunds'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
export function useFundConfirmation(project: string, recovery: FundRecovery, saved: () => void) {
  return usePaymentConfirmation(
    project,
    recovery,
    saved,
    { preview: previewFunds, confirm: confirmFunds },
    {
      unavailable: 'Funds.recoveryUnavailable',
      clearFailed: 'Funds.recoveryClearFailed',
      unknown: 'Funds.unknown'
    }
  )
}
