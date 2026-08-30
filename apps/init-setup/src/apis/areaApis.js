import { createCrud } from './crudFactory'

// 구역 (위치 계층: Building > Floor > Area > Map) (init-setup-be: /api/v1/areas)
export const { create, list, getById, update, remove } = createCrud('areas')
