export const allRoles = [
  { value: 'SYSTEM_ADMIN', roleName: 'roleSystemAdmin', userLevel: 3 },
  { value: 'SYSTEM_MANAGER', roleName: 'roleSystemManager', userLevel: 2 },
  { value: 'GROUP_MANAGER', roleName: 'roleGroupManager', userLevel: 1 },
  { value: 'SITE_MANAGER', roleName: 'roleSiteManager', userLevel: 0 },
  { value: 'TERM_MANAGER', roleName: 'roleTermManager', userLevel: 4 },
  { value: 'INSTALL_MANAGER', roleName: 'roleInstallManager', userLevel: 5 }
]

export const getUserLevelByuserRole = (value) => {
  return allRoles.find((r) => r.value === value)?.userLevel
}

export const allUserStatus = [
  { value: 'ACTIVE', statusName: 'active' },
  { value: 'SUSPENDED', statusName: 'suspend' },
  { value: 'WITHDRAWAL', statusName: 'delete' }
]
