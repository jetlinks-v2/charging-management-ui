import * as financeAllocation from './api/financeAllocation'
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
import {
  queryPropertyUsers,
  countPropertyUsers,
  getPropertyUser,
  getUserIdentities,
  setUserIdentities,
  synchronizeUsers,
  getUserSyncStatus
} from './api/user'
import { getProjectOptions } from './api/project'
import * as archive from './api/archive'
import {
  getOrganizationTree,
  getOrganization,
  getOrganizationTypes,
  setOrganizationType,
  synchronizeOrganizations,
  getOrganizationSyncStatus
} from './api/organization'

export default {
  apis: {
    ...archive,
    ...financeAllocation,
    ...financeDocument,
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
    ...financeRecorded,
    queryPropertyUsers,
    countPropertyUsers,
    getPropertyUser,
    getUserIdentities,
    setUserIdentities,
    synchronizeUsers,
    getUserSyncStatus,
    getProjectOptions,
    getOrganizationTree,
    getOrganization,
    getOrganizationTypes,
    setOrganizationType,
    synchronizeOrganizations,
    getOrganizationSyncStatus
  },
  components: {}
}
