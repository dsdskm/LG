import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

/**
 * Fetch short-lived, scoped AWS credentials so the web client can connect to
 * AWS IoT Core MQTT. The request is authenticated via the bearer token injected
 * by the axios client interceptor; unauthenticated callers receive 401.
 * @returns {Promise<{accessKeyId, secretAccessKey, sessionToken, expiration, endpoint, region}>}
 */
export const getMqttCredentials = async () => {
  const response = await axiosOta.post(ENDPOINTS.MQTT.CREDENTIALS)
  return response.results
}
