import { createCrud } from './crudFactory'

// 언어 마스터 (init-setup-be: /api/v1/languages)
export const { create, list, getById, update, remove } = createCrud('languages')
