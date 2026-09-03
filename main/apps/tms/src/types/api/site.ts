export interface Site {
  siteId: string
  siteCode: string
  siteName: string
  groupId: string
  groupName: string
  siteAddressOne: string
  siteAddressTwo: string
  siteAddressCity: string
  siteAddressState: string
  siteAddressPostalCode: string
  siteLatitude: number
  siteLongitude: number
  isDefaultSite: boolean
  buildings: Building[]
}

export interface Building {
  buildingId: string
  siteId: string
  buildingName: string
  totalFloors: number
  totalAreas: number
  createdAt: string
  updatedAt: string
  floors: Floor[]
}

export interface Floor {
  floorId: string
  floorName: string
  floorIndex: number
  totalAreas: number
  createdAt: string
  updatedAt: string
  areas: Area[]
}

export interface Area {
  areaId: string
  floorId: string
  areaName: string
  createdAt: string
  updatedAt: string
}
