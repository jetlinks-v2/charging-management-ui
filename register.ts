import * as financeReceivable from './api/financeReceivable'
import * as financeCashier from './api/financeCashier'
import * as financeFunds from './api/financeFunds'
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
    ...finance,
    ...financeSubject,
    ...financeStandard,
    ...financeSetting,
    ...financeReceivable,
    ...financeCashier,
    ...financeFunds,
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
