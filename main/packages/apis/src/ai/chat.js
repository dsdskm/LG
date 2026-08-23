const BASE_URL = import.meta.env.VITE_AI_CHAT_SERVICE_URL

export async function postSiteAssistantChat({
  message,
  currentPath,
  currentApp,
  author,
  conversationId,
  groupId,
  siteId,
  context,
  signal
}) {
  const key = currentPath && currentPath.startsWith('/') ? currentPath.substring(1) : currentPath

  const response = await fetch(`${BASE_URL}/chat/site-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      currentPath,
      currentApp,
      key,
      author,
      conversationId,
      groupId,
      siteId,
      context
    }),
    signal
  })

  return response.json()
}
