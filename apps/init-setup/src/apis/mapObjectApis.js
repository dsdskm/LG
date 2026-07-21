import { createCrud } from './crudFactory'

// 맵 오브젝트 (Map 하위, bulk 생성 지원) (init-setup-be: /api/v1/map-objects)
export const { create, list, getById, update, remove, bulkCreate } = createCrud('map-objects', { bulk: true })
