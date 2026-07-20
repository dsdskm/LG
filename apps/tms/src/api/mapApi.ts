import { useMutation } from '@tanstack/react-query'

const baseurl = import.meta.env.VITE_API_MAP_BASE_URL

export interface GetMapRequest {
  mapId: string
}

export interface MapData {
  versionId: string
  pngDownloadUrl: string | null
  svgDownloadUrl: string | null
  resolution: number
  origin: number[]
}

export interface MapPoiName {
  [key: string]: unknown
  default?: string
  'ko-KR'?: string
  'en-US'?: string
}

export interface MapPoi {
  poiId: string
  name: MapPoiName
  type: string
  x: number
  y: number
  z: number
  yawDeg: number
  tolerance: unknown
  properties: Record<string, unknown>
}

export interface MapPoiData {
  versionId: string
  pois: MapPoi[]
}

export interface GetMapResponse {
  mapId: string
  mapData: MapData
  poiData: MapPoiData
}

type RawMapViewResponse = {
  mapId: string
  navi: {
    versionId: string
    pngDownloadUrl: string | null
    svgDownloadUrl: string | null
    resolution: number
    origin: number[]
  }
  poi: {
    versionId: string
    pois: MapPoi[]
  }
}

function normalizeDownloadUrl(url: string | null | undefined): string | null {
  if (!url) return null

  return url
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
}

function normalizeMapData(navi: RawMapViewResponse['navi']): MapData {
  return {
    versionId: navi.versionId,
    pngDownloadUrl: normalizeDownloadUrl(navi.pngDownloadUrl),
    svgDownloadUrl: normalizeDownloadUrl(navi.svgDownloadUrl),
    resolution: navi.resolution,
    origin: navi.origin,
  }
}

function normalizePoiData(poi: RawMapViewResponse['poi'] | null | undefined): MapPoiData {
  return {
    versionId: poi?.versionId ?? '',
    pois: Array.isArray(poi?.pois) ? poi.pois : [],
  }
}

async function getMap(params: GetMapRequest): Promise<GetMapResponse> {
  const response = await fetch(
    `${baseurl}/swagger-api/v1/maps/${params.mapId}/view`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-util-api-key': import.meta.env.VITE_X_UTIL_API_KEY ?? '',
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `getMap failed. HTTP ${response.status}: ${response.statusText}`
    )
  }

  const data = (await response.json()) as RawMapViewResponse

  return {
    mapId: data.mapId,
    mapData: normalizeMapData(data.navi),
    poiData: normalizePoiData(data.poi),
  }
}

export function useGetMap() {
  return useMutation<GetMapResponse, Error, GetMapRequest>({
    mutationFn: getMap,
  })
}

export { getMap }