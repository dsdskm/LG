import { createCrud } from './crudFactory'

// 로봇 셋업 (init-setup-be: /api/v1/robot-setups)
export const { create, list, getById, update, remove } = createCrud('robot-setups')
