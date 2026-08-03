import { API_CONFIG } from '@repo/apis'

export const ENDPOINTS = {
  CATEGORY_NODE: `${API_CONFIG.PREFIX_CMS}/category-node`,
  CONTENT: `${API_CONFIG.PREFIX_CMS}/content`,
  CONTENT_LIST: `${API_CONFIG.PREFIX_CMS}/content/list`,
  CONTENT_SUB: `${API_CONFIG.PREFIX_CMS}/content-sub`,
  CONTENT_TYPE: `${API_CONFIG.PREFIX_CMS}/content-type`,
  EMBEDDING_DOCUMENT: `${API_CONFIG.PREFIX_CMS}/embedding-document`,
  EXTERNAL_SERVICE: `${API_CONFIG.PREFIX_CMS}/external-service`,
  FILE_CONTENT: `${API_CONFIG.PREFIX_CMS}/file-content`,
  GOOGLE_VOICE: `${API_CONFIG.PREFIX_CMS}/google-voice`,
  GROUP: `${API_CONFIG.PREFIX_CMS}/group`,
  LABEL: `${API_CONFIG.PREFIX_CMS}/label`,
  LANGUAGE: `${API_CONFIG.PREFIX_CMS}/language`,
  SWAGGER: `${API_CONFIG.PREFIX_CMS}/swagger`,
  VECTOR_DB: `${API_CONFIG.PREFIX_CMS}/vector-db`,
  VOICE_QUERY: `${API_CONFIG.PREFIX_CMS}/voice-query`,
  ROBOT_ACTION: `${API_CONFIG.PREFIX_CMS}/robot-action`,
  AGENT: `${API_CONFIG.PREFIX_CMS}/agent`
}
