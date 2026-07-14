import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Button, Input } from '@repo/ui'
import { ButtonWrapper, GreenDescBox, GreenDescTitle, GreenDescItem, ErrorMessage } from '../styles'
import { requestPasswordReset } from '@repo/apis'
import CheckCircle from '../../../../assets/checkCircle.svg'

export default function ResetPassword({ t = (k) => k }) {
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
    defaultValues: { email: '' },
    shouldUnregister: false
  })

  const [step, setStep] = useState('email')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    setFocus('code')
    if (step === 'email') setFocus('email')
  }, [step, setFocus])

  const handleEmailSubmit = async (data) => {
    setServerError('')
    const email = (data.email || '').trim()
    setValue('email', email || '')

    if (!email) {
      setServerError(t('errorReport'))
      return
    }

    setIsSendingEmail(true)

    try {
      const response = await requestPasswordReset(email)
      if (response || response == '') {
        setStep('result')
      } else {
        setServerError(t('errorReport'))
      }
    } catch (error) {
      setServerError(t('errorReport'))
    } finally {
      setIsSendingEmail(false)
    }
  }

  const emailInput = (
    <section>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <form onSubmit={handleSubmit(handleEmailSubmit)} noValidate>
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
                {isSendingEmail ? t('sending') : t('sendInitPassword')}
              </Button>
            </ButtonWrapper>
          </div>
        </form>
      </div>
    </section>
  )

  const resultDisplay = (
    <section>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <GreenDescBox>
          <div style={{ paddingTop: '5px' }}>
            <CheckCircle />
          </div>
          <div style={{ marginLeft: '10px' }}>
            <GreenDescTitle>{t('requestResetPw')}</GreenDescTitle>
            <GreenDescItem>{t('setPasswordLink')}</GreenDescItem>
          </div>
        </GreenDescBox>
      </div>
    </section>
  )

  return <div id="startResetPassword">{step === 'email' ? emailInput : resultDisplay}</div>
}
