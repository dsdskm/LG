import { createCrud } from './crudFactory'

// POI 그룹 (Map 하위) (init-setup-be: /api/v1/poi-groups)
export const { create, list, getById, update, remove } = createCrud('poi-groups')
