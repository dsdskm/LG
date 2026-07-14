import React, { useState, useMemo, useEffect } from 'react'
import { StyledPageContent, Title, Button, Tabs, Tab } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@repo/stores'
import UserList from './tabs/UserList'
import PermissionApproval from './tabs/PermissionApproval'

const UserManagement = () => {
  const { t } = useTranslation('robot')

  return (
    <StyledPageContent className="column">
      <Title>{t('userManage')}</Title>
      <Tabs defaultActiveId="tabUser">
        <Tab id="tabUser" label={t('userManage')}>
          <UserList t={t} />
        </Tab>
        <Tab id="tabAuth" label={t('roleApprove')}>
          <PermissionApproval t={t} />
        </Tab>
      </Tabs>
    </StyledPageContent>
  )
}

export default UserManagement
