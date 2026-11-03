import { getChargingContext } from './api/context'
import { getProjectOptions } from './api/project'
import { getOrganizationTree, getOrganization, getOrganizationTypes, setOrganizationType,
  synchronizeOrganizations, getOrganizationSyncStatus } from './api/organization'

export default {
  apis: { getChargingContext, getProjectOptions, getOrganizationTree, getOrganization, getOrganizationTypes,
    setOrganizationType, synchronizeOrganizations, getOrganizationSyncStatus },
  components: {}
}
