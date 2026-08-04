export const allRoles = [
  { value: 'SYSTEM_ADMIN', roleName: '시스템 관리자', userLevel: 3 },
  { value: 'SYSTEM_MANAGER', roleName: '운영 관리자', userLevel: 2 },
  { value: 'GROUP_MANAGER', roleName: '그룹 관리자', userLevel: 1 },
  { value: 'SITE_MANAGER', roleName: '사이트 관리자', userLevel: 0 },
  { value: 'TERM_MANAGER', roleName: '약관 관리자', userLevel: 4 }
]

export const getUserLevelByuserRole = (value) => {
  return allRoles.find((r) => r.value === value)?.userLevel
}

export const allUserStatus = [
  { value: 'ACTIVE', statusName: '활성' },
  { value: 'SUSPENDED', statusName: '정지' },
  { value: 'WITHDRAWAL', statusName: '삭제' }
]
