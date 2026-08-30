import { createCrud } from './crudFactory'

// 존 (Map 하위, bulk 생성 지원) (init-setup-be: /api/v1/zones)
export const { create, list, getById, update, remove, bulkCreate } = createCrud('zones', { bulk: true })
