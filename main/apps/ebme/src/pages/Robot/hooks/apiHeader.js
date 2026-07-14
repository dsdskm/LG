// copy from ebme backend
const apiHeader = {
  GetTest: 1,

  SetRobotAdmin: 20000,
  DeleteRobotAdmin: 20001,
  DeleteRobot: 20002,

  GetDevice: 20003,
  GetDeviceAll: 20004,
  DeleteDevice: 20005,

  GetBattery: 20006,
  GetBatteryAll: 20007,
  DeleteBattery: 20008,

  GetActionPeriod: 20009,
  GetActionLatest: 20010,
  GetActionNday: 20011,
  DeleteActionNday: 20012,
  DeleteActionPeriod: 20013,
  DeleteActionAll: 20014,

  GetMode: 20015,
  GetModeAll: 20016,

  SetExpendable: 20017,
  GetExpendable: 20018,
  SetRobotExpendable: 20019,
  GetRobotExpendable: 20020,
  GetExpendableStatus: 20021,
  GetExpendableStatusAll: 20022,
  DeleteExpendable: 20023,
  DeleteRobotExpendable: 20024,
  DeleteRobotExpendableAll: 20025,

  SetMap: 20026,
  GetMap: 20027,
  SetRobotMap: 20028,
  GetRobotMap: 20029,
  GetRobotMapAll: 20030,
  DeleteMap: 20031,
  DeleteRobotMap: 20032,
  DeleteRobotMapName: 20033,
  DeleteRobotMapAll: 20034,

  SetPoi: 20035,
  GetPoi: 20036,
  SetRobotPoi: 20037,
  GetRobotPoi: 20038,
  DeletePoi: 20039,
  DeleteRobotPoi: 20040,
  DeleteRobotPoiAll: 20041,

  SetResource: 20042,
  GetResource: 20043,
  SetRobotResource: 20044,
  GetRobotResource: 20045,
  GetRobotResourceAll: 20046,
  DeleteResource: 20047,
  DeleteRobotResource: 20048,
  DeleteRobotResourceName: 20049,
  DeleteRobotResourceAll: 20050,

  SetSensor: 20051,
  GetSensor: 20052,
  SetRobotSensor: 20053,
  GetRobotSensor: 20054,
  GetSensorStatus: 20055,
  GetSensorStatusAll: 20056,
  DeleteSensor: 20057,
  DeleteRobotSensor: 20058,
  DeleteRobotSensorAll: 20059,

  SetSchedule: 20060,
  GetSchedule: 20061,
  DeleteSchedule: 20062,
  SetRobotSchedule: 20063,
  GetRobotSchedule: 20064,
  DeleteRobotSchedule: 20065,
  DeleteRobotScheduleAll: 20066,

  SetMovePath: 20067,
  GetMovePath: 20068,
  SetRobotMovePath: 20069,
  GetRobotMovePath: 20070,
  DeleteMovePath: 20071,
  DeleteRobotMovePath: 20072,
  DeleteRobotMovePathAll: 20073,

  GetLocationNday: 20074,
  GetLocationPeriod: 20075,
  GetLocationLatest: 20076,
  DeleteLocationNday: 20077,
  DeleteLocationPeriod: 20078,
  DeleteLocationAll: 20079,
  SetLocationInterval: 20080,

  GetErrorNday: 20081,
  GetErrorPeriod: 20082,
  GetErrorLatest: 20083,
  DeleteErrorNday: 20084,
  DeleteErrorPeriod: 20085,
  DeleteErrorAll: 20086,

  GetPushMessageNday: 20087,
  GetPushMessagePeriod: 20088,
  GetPushMessageLatest: 20089,
  DeletePushMessageNday: 20090,
  DeletePushMessagePeriod: 20091,
  DeletePushMessageAll: 20092,

  SetBranch: 20093,
  GetBranch: 20094,
  SetRobotBranch: 20095,
  GetRobotBranch: 20096,
  DeleteBranch: 20097,
  DeleteRobotBranch: 20098,
  DeleteRobotBranchAll: 20099,

  SetRobotStatistics: 20100,
  GetRobotStatistics: 20101,
  DeleteRobotStatistics: 20102,
  DeleteRobotStatisticsAll: 20103,

  SetForbiddenArea: 20104,
  SendCommand: 20105,

  GetImageStreamingUrl: 20106,

  GetRobotAdmin: 20107,
  GetRobot: 20108,
  SetRobot: 20109,
  SetDevice: 20110,
  SetErrorLog: 20111,
  SetPushMessageLog: 20112,
  SetActionLog: 20113,
  DeleteMode: 20114,
  GetRobotStatisticsAll: 20115,

  GetDeviceAllFilter: 20116,
  GetDeviceFilterNickName: 20117,
  GetDeviceFilterMainState: 20118,
  GetDeviceFilterSubState: 20119,
  GetDeviceFilterRobotType: 20120,
  GetDeviceFilterBranchName: 20121,
  GetDeviceFilterBuildingName: 20122,
  GetDeviceFilterFloor: 20123,

  GetRobotMapAllFilter: 20124,

  UpdateDevice: 20125,

  GetErrorFilter: 20126,
  GetPushMessageFilter: 20127,

  GetRobotStatisticsFilter: 20128,

  GetMapAllFilter: 20129,

  GetRobotMapFilterMapName: 20130,
  GetRobotMapFilterBuildingName: 20131,
  GetMapFilterMapName: 20132,
  GetMapFilterBuildingName: 20133,

  GetBranchAll: 20134,
  GetBranchFilterBranchName: 20135,
  GetRobotBranchFilterBranchName: 20136,

  GetErrorFilterErrorName: 20137,
  GetErrorFilterNickName: 20138,

  GetPushMessageFilterAlarmCode: 20139,
  GetPushMessageFilterNickName: 20140,

  GetRobotStatisticsFilterAll: 20141,

  GetScheduleAll: 20142,
  GetRobotScheduleAll: 20143,
  DeleteScheduleByID: 20144,
  DeleteRobotScheduleByID: 20145,
  GetRobotScheduleFilter: 20146,

  GetBranchFilterBuildingName: 20147,
  GetRobotBranchFilterBuildingName: 20148,

  GetMessageLatest: 20149,
  GetMessageFilter: 20150,
  SetMessageLog: 20151,
  DeleteMessageNday: 20152,
  DeleteMessagePeriod: 20153,
  DeleteMessageAll: 20154,
  GetMessageFilterNickName: 20155,

  GetNoticeFilter: 20156,
  SetNoticeLog: 20157,
  DeleteNoticeNday: 20158,
  DeleteNoticePeriod: 20159,
  DeleteNoticeAll: 20160,
  GetNoticeFilterTitle: 20161,
  GetNoticeFilterEditor: 20162,

  GetDeviceLogPeriod: 20163,
  GetDeviceLogAll: 20164,
  SetDeviceLog: 20165,
  DeleteDeviceLogNday: 20166,
  DeleteDeviceLogPeriod: 20167,
  DeleteDeviceLogAll: 20168,

  UpdatePushMessageReadFlag: 20169,
  UpdateMessageReadFlag: 20170,

  GetRobotStatisticsMileages: 20171,
  GetRobotStatisticsSumResult: 20172,

  GetRobotScheduleFilterSpecific: 20173,
  UpdateRobotSchedule: 20174,

  GetRobotPoiFilter: 20175,
  GetRobotPoiFilterBuildingName: 20176,
  GetRobotPoiFilterFloor: 20177,

  UpdatePoi: 20178,
  UpdateRobotPoi: 20179,

  GetPoiFilter: 20180,
  GetPoiFilterBuildingName: 20181,
  GetPoiFilterFloor: 20182,

  DeletePushMessageByID: 20183,
  DeleteMessageByID: 20184,
  DeleteNoticeByID: 20185,

  GetMapFilterSpecific: 20186,

  DeleteMapByID: 20187,
  DeletePoiByID: 20188,

  GetMapFilterFloor: 20189,
  UpdateMap: 20190,

  GetMapLog: 20191,
  GetMapLogFilter: 20192,
  GetMapLogLatest: 20193,
  GetMapLogFilterBuildingName: 20194,
  GetMapLogFilterFloor: 20195,
  DeleteMapLogByID: 20196,

  CheckValidationRobotSchedule: 20197,

  UpdateNoticeReadFlag: 20198,

  GetDeviceFilterBuildingNameForContents: 20199,
  GetDeviceFilterFloorForContents: 20200,

  UpdateRobotResource: 20201,
  GetRobotResourceFilter: 20202,
  GetResourceLogFilter: 20203,

  GetMessageNday: 20204,

  GetRobotResourceFilterBranchName: 20205,
  GetRobotResourceFilterBuildingName: 20206,
  GetRobotResourceFilterFloor: 20207,
  GetRobotResourceFilterRscName: 20208,
  GetRobotResourceFilterDeviceID: 20209,

  DeleteRobotResourceByID: 20210,
  DeleteResourceLogByID: 20211,

  SetRobotResourceGroup: 20212,
  GetNoticeByID: 20213,
  GetBranchFilterFloor: 20214,
  CheckValidationMapInfo: 20215,
  SetNoticeLogGroup: 20216,
  UpdateBranch: 20217,
  SetRobotAdminWithROSDomainID: 20218,
  GetStatisticsFoodSales: 20219,
  DeleteBranchInfo: 20220,
  DeleteBranchByID: 20221,

  SetObstacle: 20222,
  UpdateObstacle: 20223,
  GetObstacle: 20224,
  DeleteObstacle: 20225,

  SetTable: 20226,
  UpdateTableFlag: 20227,
  UpdateTable: 20228,
  GetTable: 20229,
  DeleteTable: 20230,

  SetFoodMenu: 20231,
  UpdateFoodMenu: 20232,
  GetFoodMenu: 20233,
  DeleteFoodMenu: 20234,
  GetCategoryFilterFoodMenu: 20235,

  SetContentsFoodMenu: 20236,
  GetContentsFoodMenu: 20237,

  GetFoodMenuLog: 20238,

  SetDeviceMainStateCategory: 20239,
  GetDeviceMainStateCategory: 20240,
  DeleteDeviceMainStateCategory: 20241,

  SetFoodCategory: 20242,
  GetFoodCategory: 20243,
  DeleteFoodCategory: 20244,

  SetTableOccupancy: 20245,

  GetRobotStatisticsDaysMileage: 20246,
  GetRobotStatisticsWeeksMileage: 20247,
  GetRobotStatisticsMonthsMileage: 20248,

  SetFoodMenuOrdered: 20249,
  GetFoodMenuOrdered: 20250,

  GetFoodMenuOrderedTableID: 20251,
  MoveToPoi: 20252,
  DockingRobot: 20253,
  UndockingRobot: 20254,

  LoadCompleteSKKU: 20255,
  CleanTableCompleteSKKU: 20256,

  GetDeviceFilter: 20258,

  RotateRobot: 20259,
  StopRobot: 20260,
  GetNavigationStatusAll: 20261,
  DockingByPub: 20262,
  UndockingByPub: 20263,
  StopByPub: 20264,

  SendFile: 20500,
  SendRobotResource: 20501,
  SendRobotResourceGroup: 20502,
  SendFirmware: 20503,

  SendDummyForConnectToServer: 21000,
  GetLocation: 21001,
  GetNavigationActionStatus: 21002,
  GetNavigationStatus: 21003,

  SetRosDomainId: 21004,
  GetRosDomainId: 21005
}
export default apiHeader

