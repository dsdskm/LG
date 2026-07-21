import { createCrud } from './crudFactory'

// 사이트 (Site 1:N Map) (init-setup-be: /api/v1/sites)
export const { create, list, getById, update, remove } = createCrud('sites')
