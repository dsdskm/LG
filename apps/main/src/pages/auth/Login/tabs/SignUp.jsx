import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Button, Input } from '@repo/ui'
import {
  ButtonWrapper,
  BlueDescBox,
  BlueDescTitle,
  BlueDescList,
  BlueDescItems,
  GreenDescBox,
  GreenDescItem,
  GreenDescEmail,
  ErrorMessage
} from '../styles'
import { signUpVerificationCode, signUpVerificationCodeVerify, signUpApply } from '@repo/apis'
import SvgEnvelope from '../../../../assets/envelope.svg'
import { useModalState } from '@repo/hooks'
import ModalBasic from '../../modal/ModalBasic'

export default function SignUp({ t = (k) => k }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setFocus,
    getValues,
    setValue,
    resetField
  } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', code: '' },
    shouldUnregister: false
  })

  const [step, setStep] = useState('email')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [serverError, setServerError] = useState('')
  const [veriError, setVeriError] = useState('')
  const [nickError, setNickError] = useState('')
  const [authError, setAuthError] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')

  useEffect(() => {
    if (step === 'email') setFocus('email')
    else setFocus('code')
  }, [step, setFocus])

  const handleEmailError = (resultCode) => {
    switch (resultCode) {
      case 'USER_40901':
        setServerError(t('usingEmail'))
        break
      default:
        setServerError(t('errorReport'))
        break
    }
  }

  const handleEmailSubmit = async (data) => {
    setServerError('')
    const email = (data.email || '').trim()
    setValue('email', email || '')

    if (!email) {
      handleEmailError('')
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await signUpVerificationCode(email)
      if (response) {
        setSignUpEmail(email)
        setStep('code')
        resetField('code', { defaultValue: '' })
        resetField('nickname', { defaultValue: '' })
        resetField('authCode', { defaultValue: '' })
      } else {
        setServerError(t('errorReport'))
      }
    } catch (error) {
      handleEmailError(error.response?.data?.errorCode)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleSignUpError = (resultCode, target) => {
    let txtError = ''
    switch (resultCode) {
      case 'AUTH_40102':
        txtError = t('invalidAuthCode')
        break
      case 'AUTH_42901':
        txtError = t('lockAuthCode')
        break
      case 'LOCATION_40401':
      case 'ERR_BAD_REQUEST':
        txtError = t('invalidAuthorization')
        break
      default:
        txtError = t('errorReport')
        break
    }

    switch (target) {
      case 'code':
        setVeriError(txtError)
        break
      case 'authCode':
        setAuthError(txtError)
        break
      default:
        setAuthError(txtError)
        break
    }
  }

  const handleCodeSubmit = async (data) => {
    setVeriError('')
    setNickError('')
    setAuthError('')
    const code = (data.code || '').trim()
    const nickname = (data.nickname || '').trim()
    const authCode = (data.authCode || '').trim()

    // RHF 필드값 정리(트림 반영)
    setValue('code', code)
    setValue('nickname', nickname)
    setValue('authCode', authCode)

    // 클라이언트 측 1차 방어
    if (!code) {
      handleSignUpError('', 'code')
      return
    }
    if (!nickname) {
      handleSignUpError('', 'nickname')
      return
    }
    if (!authCode) {
      handleSignUpError('', 'authCode')
      return
    }

    setIsVerifyingCode(true)
    let stepApi = 0
    let verificationToken = ''
    try {
      const response = await signUpVerificationCodeVerify(signUpEmail, code)

      if (response) {
        stepApi++
        verificationToken = response?.verificationToken ?? ''
      } else {
        handleSignUpError('', 'code')
        return
      }

      if (verificationToken != '') {
        const response2 = await signUpApply(signUpEmail, nickname, authCode, verificationToken)

        if (response2 || response2 == '') {
          openModalBasic()
        } else {
          handleSignUpError('', 'authCode')
          return
        }
      } else {
        handleSignUpError('', 'code')
      }
    } catch (error) {
      if (stepApi === 0) {
        handleSignUpError(error.response?.data?.errorCode, 'code')
      } else {
        handleSignUpError(error.response?.data?.errorCode, 'authCode')
      }
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const SignUpProcessDesc = () => {
    return (
      <BlueDescBox>
        <BlueDescTitle>{t('signUpProcess')}</BlueDescTitle>
        <BlueDescList>
          <BlueDescItems>{t('inputEmailSendCode')}</BlueDescItems>
          <BlueDescItems>{t('inputCodeFromEmail')}</BlueDescItems>
          <BlueDescItems>{t('inputNickRoleAffiliation')}</BlueDescItems>
          <BlueDescItems>{t('receivePwLink')}</BlueDescItems>
        </BlueDescList>
      </BlueDescBox>
    )
  }

  const emailInput = (
    <section aria-labelledby="email-step">
      <div>
        <form onSubmit={handleSubmit(handleEmailSubmit)} noValidate>
          {SignUpProcessDesc()}
          <div>
            <p className="typographyBody4" style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem' }}>
              {t('email')}
            </p>
            <Controller
              name="email"
              control={control}
              rules={{
                required: t('emailRequired'),
                validate: (v) => !!(v ?? '').trim() || t('emailRequired'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('emailInvalid')
                }
              }}
              render={({ field, fieldState }) => (
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  inputMode="email"
                  isError={!!fieldState.error}
                  message={fieldState.error?.message}
                  size="md"
                  value={field.value ?? ''} // ← 항상 문자열
                  onChange={(e) => field.onChange(e?.target?.value ?? '')}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={isSendingEmail || isSubmitting}
                />
              )}
            />

            {serverError && <ErrorMessage className="typographyBody6">{serverError}</ErrorMessage>}

            <ButtonWrapper>
              <Button
                type="submit"
                size="lg"
                disabled={isSendingEmail || isSubmitting || !isValid}
                style={{ width: '100%' }}
              >
                {isSendingEmail ? t('sending') : t('verification')}
              </Button>
            </ButtonWrapper>
          </div>
        </form>
      </div>
    </section>
  )

  const BasicModal = useModalState()

  const openModalBasic = (data) => {
    BasicModal.onOpen()
  }

  const moveToLogin = () => {
    BasicModal.onClose()
    window.location.href = '/login'
  }

  const codeInput = (
    <>
      <section aria-labelledby="code-step">
        <div>
          <form onSubmit={handleSubmit(handleCodeSubmit)} noValidate>
            {SignUpProcessDesc()}
            <GreenDescBox>
              <SvgEnvelope />
              <GreenDescItem>
                {t('sentAuthCode')}
                <GreenDescEmail>{signUpEmail}</GreenDescEmail>
              </GreenDescItem>
            </GreenDescBox>

            <p
              className="typographyBody4"
              style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem', marginTop: '1.5rem' }}
            >
              {t('authCode') + ' *'}
            </p>
            <Controller
              name="code"
              control={control}
              rules={{
                required: t('codePlaceholder'),
                validate: {
                  notBlank: (v) => (v?.trim().length ? true : t('codePlaceholder'))
                }
              }}
              render={({ field, fieldState }) => (
                <Input
                  type="text"
                  placeholder={t('codePlaceholder')}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  isError={!!fieldState.error}
                  message={fieldState.error?.message}
                  size="md"
                  value={field.value ?? ''} // ← 항상 문자열
                  onChange={(e) => {
                    const next = (e?.target?.value ?? '').replace(/\D/g, '')
                    field.onChange(next)
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={isVerifyingCode || isSubmitting}
                />
              )}
            />

            {veriError && <ErrorMessage className="typographyBody6">{veriError}</ErrorMessage>}

            <p
              className="typographyBody4"
              style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem', marginTop: '1.5rem' }}
            >
              {t('nickname') + ' *'}
            </p>
            <Controller
              name="nickname"
              control={control}
              rules={{
                required: t('inputNick'),
                validate: {
                  notBlank: (v) => (v?.trim().length ? true : t('inputNick'))
                }
              }}
              render={({ field, fieldState }) => (
                <Input
                  type="text"
                  placeholder={t('inputNick')}
                  isError={!!fieldState.error}
                  message={fieldState.error?.message}
                  size="md"
                  value={field.value ?? ''} // ← 항상 문자열
                  onChange={(e) => field.onChange(e?.target?.value ?? '')}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={isVerifyingCode || isSubmitting}
                />
              )}
            />

            {nickError && <ErrorMessage className="typographyBody6">{nickError}</ErrorMessage>}

            <p
              className="typographyBody4"
              style={{ whiteSpace: 'pre-wrap', marginBottom: '0.7rem', marginTop: '1.5rem' }}
            >
              {t('authorizationCode') + ' *'}
            </p>
            <Controller
              name="authCode"
              control={control}
              rules={{
                required: t('inputAuthorizationCode'),
                validate: {
                  notBlank: (v) => (v?.trim().length ? true : t('inputAuthorizationCode'))
                }
              }}
              render={({ field, fieldState }) => (
                <Input
                  type="text"
                  placeholder={t('inputAuthorizationCode')}
                  isError={!!fieldState.error}
                  message={fieldState.error?.message}
                  size="md"
                  value={field.value ?? ''} // ← 항상 문자열
                  onChange={(e) => field.onChange(e?.target?.value ?? '')}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={isVerifyingCode || isSubmitting}
                />
              )}
            />

            {authError && <ErrorMessage className="typographyBody6">{authError}</ErrorMessage>}

            <ButtonWrapper>
              <Button
                type="submit"
                size="lg"
                disabled={isVerifyingCode || isSubmitting || !isValid}
                style={{ width: '100%' }}
              >
                {isVerifyingCode ? t('confirming') : t('approvalRequest')}
              </Button>
            </ButtonWrapper>
            <ModalBasic
              isOpen={BasicModal.isOpen}
              onClose={BasicModal.onClose}
              onConfirm={moveToLogin}
              t={t}
              descIdx={0}
              btnIdx={0}
            />

            {/* <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('email')}
              disabled={isVerifyingCode || isSubmitting}
            >
              이메일 다시 입력
            </Button>
          </div> */}
          </form>
        </div>
      </section>
    </>
  )

  return <div id="startSignUp">{step === 'email' ? emailInput : codeInput}</div>
}
