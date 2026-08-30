import { createCrud } from './crudFactory'

// 맵 POI (Map 하위, bulk 생성 지원) (init-setup-be: /api/v1/map-pois)
export const { create, list, getById, update, remove, bulkCreate } = createCrud('map-pois', { bulk: true })
