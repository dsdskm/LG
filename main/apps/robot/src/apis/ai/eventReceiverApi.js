import { axiosEventReceiver, pathEventReceiver } from './shared'

/**
 * 이벤트 단건 조회
 * GET /events/:id
 */
export const getEventById = async (eventId) => {
  if (!eventId) return null

  const url = `${pathEventReceiver}/${encodeURIComponent(String(eventId))}`

  try {
    const response = await axiosEventReceiver.get(url)
    return response
  } catch (e) {
    return null
  }
}
