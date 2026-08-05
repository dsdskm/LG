import { useTranslation } from 'react-i18next'
import { LoginPage } from '@repo/ui'
import SignUp from './tabs/SignUp'
import ResetPassword from './tabs/ResetPassword'

function Login() {
  const { t } = useTranslation('login')

  return (
    <LoginPage
      redirectTo="/robot/dashboard"
      extraTabs={[
        { id: 'signUp', label: t('signUp'), content: <SignUp t={t} /> },
        { id: 'resetPw', label: t('resetPassword'), content: <ResetPassword t={t} /> }
      ]}
    />
  )
}

export default Login
