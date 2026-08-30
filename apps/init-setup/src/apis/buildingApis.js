import { createCrud } from './crudFactory'

// 빌딩 (위치 계층: Building > Floor > Area > Map) (init-setup-be: /api/v1/buildings)
export const { create, list, getById, update, remove } = createCrud('buildings')
