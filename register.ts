import * as financeAllocation from './api/financeAllocation'
import * as financeHandover from './api/financeHandover'
import * as financeDocument from './api/financeDocument'
import * as financeReceivable from './api/financeReceivable'
import * as financeCashier from './api/financeCashier'
import * as financeTemporary from './api/financeTemporary'
import * as financeFunds from './api/financeFunds'
import * as financeCarry from './api/financeCarry'
import * as financeActivity from './api/financeActivity'
import * as financeSetting from './api/financeSetting'
import * as financeStandard from './api/financeStandard'
import * as financeSubject from './api/financeSubject'
import * as financeTax from './api/financeTax'
import * as financeRecorded from './api/financeRecorded'
import * as finance from './api/finance'

// 收费只注册自己的能力，基础目录与页面由 property-base-ui 独立提供。
export default {
  apis: {
    ...financeAllocation,
    ...financeDocument,
    ...financeHandover,
    ...finance,
    ...financeSubject,
    ...financeStandard,
    ...financeSetting,
    ...financeReceivable,
    ...financeCashier,
    ...financeFunds,
    ...financeCarry,
    ...financeActivity,
    ...financeTemporary,
    ...financeTax,
    ...financeRecorded
  },
  components: {}
}
