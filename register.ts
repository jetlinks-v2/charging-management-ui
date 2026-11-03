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
