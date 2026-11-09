import type { AnalysisKind } from '../api/financeAnalysis'
export const analysisConfig: Record<AnalysisKind, { route: string; groups: string[]; totals: string[] }> = {
  arrears: {
    route: 'FinanceArrearsReport',
    groups: ['PROJECT', 'SUBJECT', 'SPACE', 'CUSTOMER', 'AGE', 'DETAIL'],
    totals: ['debt', 'overdue', 'spaceCount', 'overdueSpaceCount']
  },
  monthly: {
    route: 'FinanceMonthlyReport',
    groups: ['PROJECT', 'SUBJECT', 'SPACE', 'CUSTOMER', 'DETAIL'],
    totals: ['opening', 'accrual', 'settled', 'debt']
  },
  funds: {
    route: 'FinanceFundsReport',
    groups: ['TYPE', 'PROJECT', 'SUBJECT', 'SPACE', 'CUSTOMER', 'DETAIL'],
    totals: ['opening', 'income', 'refund', 'closing']
  },
  activity: {
    route: 'FinanceActivityReport',
    groups: ['ACTIVITY', 'PROJECT', 'SUBJECT', 'SPACE', 'CUSTOMER', 'MONTH', 'PERIOD', 'DETAIL'],
    totals: ['principal', 'discount', 'spaceCount', 'periods']
  },
  changes: {
    route: 'FinanceChangesReport',
    groups: ['OPERATION', 'PROJECT', 'SUBJECT', 'SPACE', 'CUSTOMER', 'MONTH', 'DETAIL'],
    totals: ['adjustment', 'remission', 'lateRemission', 'settled']
  }
}
export const analysisEnums: Record<string, string> = {
  ADVANCE: '预收款',
  DEPOSIT: '押金',
  TOPUP: '存入',
  REFUND: '退款',
  TRANSFER_IN: '划入',
  TRANSFER_OUT: '划出',
  DEDUCT: '扣款',
  OFFSET: '余额冲抵',
  RETURN_OFFSET: '冲抵退回',
  TO_ADVANCE: '退款转预收',
  ADJUST: '应收调整',
  SPLIT: '拆分',
  COLLECT: '收款核销',
  PREPAY_COLLECT: '活动预缴',
  REDUCE: '费用减免',
  REDUCE_LATE_FEE: '滞纳金减免',
  NOT_DUE: '未到期',
  DAYS_30: '逾期1～30天',
  DAYS_90: '逾期31～90天',
  DAYS_180: '逾期91～180天',
  DAYS_365: '逾期181～365天',
  OVER_365: '逾期365天以上',
  UNDATED: '未设到期日'
}
