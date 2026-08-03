import { createCrud } from './crudFactory'

// 층 (위치 계층: Building > Floor > Area > Map) (init-setup-be: /api/v1/floors)
export const { create, list, getById, update, remove } = createCrud('floors')
