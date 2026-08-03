/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

export const CONTENT_TYPE = {
  FACE_IMAGE: 'FACE:IMAGE',
  FACE_VIDEO: 'FACE:VIDEO',
  BGM: 'BGM',
  TEXT: 'TEXT',
  MOTION: 'MOTION',
  TTS: 'TTS',
  POI: 'POI',
  OBJECT: 'OBJECT'
} as const

export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE]
