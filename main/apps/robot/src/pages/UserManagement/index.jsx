import React from 'react'
import { StyledPageContent, Title, Tabs, Tab } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import UserList from './tabs/UserList'
import PermissionApproval from './tabs/PermissionApproval'
import UserInvitation from './tabs/UserInvitation'

const UserManagement = () => {
  const { t } = useTranslation('robot')

  return (
    <StyledPageContent className="column">
      <Title>{t('userManage')}</Title>
      <Tabs defaultActiveId="tabUser">
        <Tab id="tabUser" label={t('userManage')}>
          <UserList />
        </Tab>
        <Tab id="tabAuth" label={t('roleApprove')}>
          <PermissionApproval />
        </Tab>
        <Tab id="tabInvitation" label={t('invNew')}>
          <UserInvitation />
        </Tab>
      </Tabs>
    </StyledPageContent>
  )
}

export default UserManagement
