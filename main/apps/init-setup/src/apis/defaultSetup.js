import { axiosApi } from './crudFactory'
export const saveSiteCode = (payload) => axiosApi.post('/default-setup/site-code', payload)
export const getOperationLocation = () => axiosApi.get('/default-setup/operation-location')
export const saveOperationLocation = (payload) => axiosApi.post('/default-setup/operation-location', payload)
export const saveRobotInfo = (payload) => axiosApi.post('/default-setup/robot-info', payload)
